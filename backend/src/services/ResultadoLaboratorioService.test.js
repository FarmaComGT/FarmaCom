jest.mock('./BitacoraLaboratorioService');
const BitacoraLaboratorioService = require('./BitacoraLaboratorioService');
jest.mock('../daos/ResultadoLaboratorioDAO');
jest.mock('../config/almacenamiento', () => ({
  RUTA_UPLOADS_RESULTADOS: '/tmp/uploads',
  PUBLIC_API_BASE_URL: 'http://localhost:3000',
}));
jest.mock('fs/promises', () => ({ writeFile: jest.fn().mockResolvedValue() }));
jest.mock('qrcode', () => ({ toBuffer: jest.fn().mockResolvedValue(Buffer.from('qr')) }));
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn().mockResolvedValue({
      embedPng: jest.fn().mockResolvedValue({}),
      getPages: jest.fn().mockReturnValue([{ getSize: () => ({ width: 600 }), drawImage: jest.fn() }]),
      save: jest.fn().mockResolvedValue(Buffer.from('pdf-final')),
    }),
  },
}));

const crypto = require('crypto');
const fs = require('fs/promises');
const ResultadoLaboratorioDAO = require('../daos/ResultadoLaboratorioDAO');
const ResultadoLaboratorioService = require('./ResultadoLaboratorioService');

describe('ResultadoLaboratorioService', () => {
  beforeEach(() => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('token-fijo');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('subirResultado', () => {
    it('genera token, guarda el PDF final y registra el resultado con bitácora', async () => {
      ResultadoLaboratorioDAO.obtenerExpedientePorPaciente.mockResolvedValue({ id_expediente: 7 });
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.crear.mockResolvedValue({ id_resultado: 1, token_publico: 'token-fijo' });
      BitacoraLaboratorioService.registrarCambio.mockResolvedValue();

      const resultado = await ResultadoLaboratorioService.subirResultado({
        id_paciente: 3,
        categoria: 'Hematología',
        buffer: Buffer.from('pdf-original'),
        id_usuario: 9,
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('token-fijo.pdf'),
        expect.any(Buffer),
      );
      expect(ResultadoLaboratorioDAO.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          id_expediente: 7,
          categoria: 'Hematología',
          token_publico: 'token-fijo',
          ruta_archivo: 'token-fijo.pdf',
        }),
        clienteFalso,
      );
      expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledWith(
        expect.objectContaining({ entidad: 'resultado_laboratorio', accion: 'crear' }),
        clienteFalso,
      );
      expect(resultado).toEqual({ id_resultado: 1, token_publico: 'token-fijo' });
    });

    it('lanza 404 si el paciente no tiene expediente', async () => {
      ResultadoLaboratorioDAO.obtenerExpedientePorPaciente.mockResolvedValue(null);

      await expect(ResultadoLaboratorioService.subirResultado({
        id_paciente: 3,
        categoria: 'Orina',
        buffer: Buffer.from('x'),
        id_usuario: 9,
      })).rejects.toMatchObject({ status: 404 });
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPublico', () => {
    it('rechaza un token inexistente', async () => {
      ResultadoLaboratorioDAO.obtenerPorToken.mockResolvedValue(null);

      await expect(ResultadoLaboratorioService.obtenerPublico('no-existe')).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza un resultado anulado', async () => {
      ResultadoLaboratorioDAO.obtenerPorToken.mockResolvedValue({
        estado: 'anulado',
        fecha_expiracion: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });

      await expect(ResultadoLaboratorioService.obtenerPublico('token')).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza un resultado expirado', async () => {
      ResultadoLaboratorioDAO.obtenerPorToken.mockResolvedValue({
        estado: 'vigente',
        fecha_expiracion: new Date(Date.now() - 1000),
      });

      await expect(ResultadoLaboratorioService.obtenerPublico('token')).rejects.toMatchObject({ status: 404 });
    });

    it('devuelve el resultado cuando es vigente y no ha expirado', async () => {
      const fila = { estado: 'vigente', fecha_expiracion: new Date(Date.now() + 1000 * 60 * 60 * 24), ruta_archivo: 'x.pdf' };
      ResultadoLaboratorioDAO.obtenerPorToken.mockResolvedValue(fila);

      await expect(ResultadoLaboratorioService.obtenerPublico('token')).resolves.toEqual(fila);
    });
  });

  describe('anularResultado', () => {
    it('audita la anulacion con el usuario y los valores persistidos', async () => {
      const client = {};
      const anterior = { id_resultado: 1, estado: 'vigente', motivo_anulacion: null };
      const nuevo = { ...anterior, estado: 'anulado', motivo_anulacion: 'Duplicado' };
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(client));
      ResultadoLaboratorioDAO.obtenerParaActualizar.mockResolvedValue(anterior);
      ResultadoLaboratorioDAO.anular.mockResolvedValue(nuevo);
      await expect(ResultadoLaboratorioService.anularResultado(1, 'Duplicado', 9))
        .resolves.toEqual(nuevo);
      expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledWith({
        id_usuario: 9, entidad: 'resultado_laboratorio', id_entidad: 1,
        accion: 'anular', anterior, nuevo,
      }, client);
    });

    it('rechaza anular un resultado ya anulado', async () => {
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.obtenerParaActualizar.mockResolvedValue({ id_resultado: 1, estado: 'anulado' });

      await expect(
        ResultadoLaboratorioService.anularResultado(1, 'motivo', 9),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza anular un resultado inexistente', async () => {
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.obtenerParaActualizar.mockResolvedValue(null);

      await expect(
        ResultadoLaboratorioService.anularResultado(1, 'motivo', 9),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
