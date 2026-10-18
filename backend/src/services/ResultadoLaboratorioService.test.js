jest.mock('./BitacoraLaboratorioService');
const BitacoraLaboratorioService = require('./BitacoraLaboratorioService');
jest.mock('../daos/ResultadoLaboratorioDAO');
jest.mock('../daos/UsuarioDAO');
jest.mock('../config/almacenamiento', () => ({
  RUTA_UPLOADS_RESULTADOS: '/tmp/uploads',
  PUBLIC_API_BASE_URL: 'http://localhost:3000',
}));
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(),
  unlink: jest.fn().mockResolvedValue(),
}));
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
const UsuarioDAO = require('../daos/UsuarioDAO');
const ResultadoLaboratorioService = require('./ResultadoLaboratorioService');
const usuarioAdministrador = { id_usuario: 9, rol: 'administrador', id_laboratorio: null };
const usuarioLaboratorio1 = { id_usuario: 10, rol: 'laboratorista', id_laboratorio: 1 };

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
        usuario: usuarioAdministrador,
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
        usuario: usuarioAdministrador,
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

    it('rechaza un resultado vencido (purgado automáticamente)', async () => {
      ResultadoLaboratorioDAO.obtenerPorToken.mockResolvedValue({
        estado: 'vencido',
        fecha_expiracion: new Date(Date.now() - 1000 * 60 * 60 * 24),
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
      ResultadoLaboratorioDAO.obtenerParaActualizarConLaboratorio.mockResolvedValue(anterior);
      ResultadoLaboratorioDAO.anular.mockResolvedValue(nuevo);
      await expect(ResultadoLaboratorioService.anularResultado(1, 'Duplicado', usuarioAdministrador))
        .resolves.toEqual(nuevo);
      expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledWith({
        id_usuario: 9, entidad: 'resultado_laboratorio', id_entidad: 1,
        accion: 'anular', anterior, nuevo,
      }, client);
    });

    it('rechaza anular un resultado ya anulado', async () => {
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.obtenerParaActualizarConLaboratorio.mockResolvedValue({ id_resultado: 1, estado: 'anulado' });

      await expect(
        ResultadoLaboratorioService.anularResultado(1, 'motivo', usuarioAdministrador),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza anular un resultado inexistente', async () => {
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.obtenerParaActualizarConLaboratorio.mockResolvedValue(null);

      await expect(
        ResultadoLaboratorioService.anularResultado(1, 'motivo', usuarioAdministrador),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('aislamiento por laboratorio', () => {
    it('impide agregar archivos a un paciente de otro laboratorio antes de escribir en disco', async () => {
      ResultadoLaboratorioDAO.obtenerExpedientePorPaciente.mockResolvedValue({
        id_expediente: 70,
        id_laboratorio: 2,
      });

      await expect(ResultadoLaboratorioService.subirResultado({
        id_paciente: 30,
        categoria: 'Orina',
        buffer: Buffer.from('pdf-original'),
        usuario: usuarioLaboratorio1,
      })).rejects.toMatchObject({ status: 403 });

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(ResultadoLaboratorioDAO.crear).not.toHaveBeenCalled();
    });

    it('impide consultar resultados de un paciente de otro laboratorio', async () => {
      ResultadoLaboratorioDAO.obtenerExpedientePorPaciente.mockResolvedValue({
        id_expediente: 70,
        id_laboratorio: 2,
      });

      await expect(ResultadoLaboratorioService.listarPorPaciente(30, usuarioLaboratorio1))
        .rejects.toMatchObject({ status: 403 });

      expect(ResultadoLaboratorioDAO.listarPorPaciente).not.toHaveBeenCalled();
    });

    it('impide anular resultados de otro laboratorio', async () => {
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.obtenerParaActualizarConLaboratorio.mockResolvedValue({
        id_resultado: 50,
        id_laboratorio: 2,
        estado: 'vigente',
      });

      await expect(ResultadoLaboratorioService.anularResultado(
        50,
        'Archivo incorrecto',
        usuarioLaboratorio1,
      )).rejects.toMatchObject({ status: 403 });

      expect(ResultadoLaboratorioDAO.anular).not.toHaveBeenCalled();
    });

    it('impide consultar categorías de otro laboratorio', async () => {
      await expect(ResultadoLaboratorioService.obtenerCategoriasSugeridas(2, usuarioLaboratorio1))
        .rejects.toMatchObject({ status: 403 });

      expect(ResultadoLaboratorioDAO.obtenerCategoriasSugeridas).not.toHaveBeenCalled();
    });
  });

  describe('purgarResultadosVencidos', () => {
    it('lanza un error si no existe el usuario de sistema', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(null);

      await expect(ResultadoLaboratorioService.purgarResultadosVencidos()).rejects.toThrow(/usuario de sistema/);
    });

    it('marca vencido y borra del disco cada resultado pendiente, auditando con el usuario de sistema', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ id_usuario: 55 });
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.listarVencidosPendientes.mockResolvedValue([
        { id_resultado: 1, ruta_archivo: 'a.pdf' },
        { id_resultado: 2, ruta_archivo: 'b.pdf' },
      ]);
      ResultadoLaboratorioDAO.obtenerParaActualizar
        .mockResolvedValueOnce({ id_resultado: 1, estado: 'vigente', ruta_archivo: 'a.pdf' })
        .mockResolvedValueOnce({ id_resultado: 2, estado: 'vigente', ruta_archivo: 'b.pdf' });
      ResultadoLaboratorioDAO.marcarVencido
        .mockResolvedValueOnce({ id_resultado: 1, estado: 'vencido', ruta_archivo: 'a.pdf' })
        .mockResolvedValueOnce({ id_resultado: 2, estado: 'vencido', ruta_archivo: 'b.pdf' });

      const purgados = await ResultadoLaboratorioService.purgarResultadosVencidos();

      expect(purgados).toBe(2);
      expect(ResultadoLaboratorioDAO.marcarVencido).toHaveBeenCalledWith(1, expect.stringContaining('Vencimiento'), clienteFalso);
      expect(ResultadoLaboratorioDAO.marcarVencido).toHaveBeenCalledWith(2, expect.stringContaining('Vencimiento'), clienteFalso);
      expect(BitacoraLaboratorioService.registrarCambio).toHaveBeenCalledWith(
        expect.objectContaining({ id_usuario: 55, entidad: 'resultado_laboratorio', accion: 'vencer', id_entidad: 1 }),
        clienteFalso,
      );
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('a.pdf'));
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('b.pdf'));
    });

    it('omite un resultado que ya no esta vigente por una condicion de carrera', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ id_usuario: 55 });
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.listarVencidosPendientes.mockResolvedValue([
        { id_resultado: 1, ruta_archivo: 'a.pdf' },
      ]);
      ResultadoLaboratorioDAO.obtenerParaActualizar.mockResolvedValue({ id_resultado: 1, estado: 'anulado' });

      const purgados = await ResultadoLaboratorioService.purgarResultadosVencidos();

      expect(purgados).toBe(0);
      expect(ResultadoLaboratorioDAO.marcarVencido).not.toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('no falla si el archivo ya no existe en disco', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ id_usuario: 55 });
      const clienteFalso = {};
      ResultadoLaboratorioDAO.ejecutarEnTransaccion.mockImplementation((op) => op(clienteFalso));
      ResultadoLaboratorioDAO.listarVencidosPendientes.mockResolvedValue([
        { id_resultado: 1, ruta_archivo: 'a.pdf' },
      ]);
      ResultadoLaboratorioDAO.obtenerParaActualizar.mockResolvedValue({ id_resultado: 1, estado: 'vigente', ruta_archivo: 'a.pdf' });
      ResultadoLaboratorioDAO.marcarVencido.mockResolvedValue({ id_resultado: 1, estado: 'vencido', ruta_archivo: 'a.pdf' });
      fs.unlink.mockRejectedValueOnce(Object.assign(new Error('no existe'), { code: 'ENOENT' }));

      await expect(ResultadoLaboratorioService.purgarResultadosVencidos()).resolves.toBe(1);
    });
  });
});
