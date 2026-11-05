jest.mock('../daos/ResumenDiarioEnvioDAO');
jest.mock('./ResumenDiarioGestionService');
jest.mock('./ResumenDiarioPdfService');
jest.mock('./CorreoService');
jest.mock('../config/correo');
const DAO = require('../daos/ResumenDiarioEnvioDAO');
const Gestion = require('./ResumenDiarioGestionService');
const Pdf = require('./ResumenDiarioPdfService');
const Correo = require('./CorreoService');
const Config = require('../config/correo');
const Service = require('./ResumenDiarioEnvioService');

const datos = { fecha: '2026-11-04', corte: '2026-11-05T02:00:00Z', estado: 'provisional',
  resumen: { ingresos: 100, ventas: 3, utilidad_bruta: 20, sesiones_abiertas: 1 } };
const envio = { id_envio: '12', id_reporte: '7', destinatario: 'dueno@example.com', datos };
beforeEach(() => {
  jest.resetAllMocks();
  Gestion.obtenerReporte.mockResolvedValue({ datos });
  Gestion.obtenerConfiguracion.mockResolvedValue({ correo_destinatario: 'dueno@example.com' });
  DAO.reclamar.mockResolvedValue(envio);
  Pdf.generar.mockResolvedValue(Buffer.from('%PDF'));
  Correo.enviar.mockResolvedValue({ messageId: 'mensaje-12' });
});
test('encola con el destinatario configurado sin generar ni enviar aún', async () => {
  DAO.solicitar.mockResolvedValue({ id_envio: '12', estado: 'pendiente' });
  expect(await Service.solicitar(9, '7')).toMatchObject({ estado: 'pendiente' });
  expect(Gestion.obtenerReporte).toHaveBeenCalledWith(9, '7');
  expect(DAO.solicitar).toHaveBeenCalledWith(9, '7', 'dueno@example.com');
  expect(Pdf.generar).not.toHaveBeenCalled();
  expect(Correo.enviar).not.toHaveBeenCalled();
});
test('rechaza un reporte ajeno antes de consultar la configuración', async () => {
  Gestion.obtenerReporte.mockRejectedValue(new Error('Reporte no encontrado'));
  await expect(Service.solicitar(9, '7')).rejects.toThrow('Reporte no encontrado');
  expect(DAO.solicitar).not.toHaveBeenCalled();
});
test('requiere destinatario y transporte configurados', async () => {
  Gestion.obtenerConfiguracion.mockResolvedValue({ correo_destinatario: '' });
  await expect(Service.solicitar(9, '7')).rejects.toMatchObject({ status: 400 });
  expect(DAO.solicitar).not.toHaveBeenCalled();
});
test('no encola si falta SMTP', async () => {
  Config.obtenerConfiguracionCorreo.mockImplementation(() => { throw new Error('Sin SMTP'); });
  await expect(Service.solicitar(9, '7')).rejects.toThrow('Sin SMTP');
  expect(DAO.solicitar).not.toHaveBeenCalled();
});
test('envía los datos históricos y adjunta bytes en memoria', async () => {
  await expect(Service.procesarUno()).resolves.toBe(true);
  expect(Pdf.generar).toHaveBeenCalledWith(datos);
  expect(Correo.enviar).toHaveBeenCalledWith(expect.objectContaining({
    destinatario: envio.destinatario, asunto: expect.stringContaining('provisional'),
    texto: expect.stringContaining('Cajas pendientes de cierre: 1'),
    adjuntos: [expect.objectContaining({ content: Buffer.from('%PDF'), contentType: 'application/pdf' })],
  }));
  expect(DAO.finalizar).toHaveBeenCalledWith('12', 'aceptado', 'mensaje-12', null);
});
test('sin pendientes no genera ni envía', async () => {
  DAO.reclamar.mockResolvedValue(null);
  expect(await Service.procesarUno()).toBe(false);
  expect(Correo.enviar).not.toHaveBeenCalled();
});
test('una falla del PDF queda fallida sin iniciar SMTP', async () => {
  Pdf.generar.mockRejectedValue(new Error('PDF inválido'));
  await Service.procesarUno();
  expect(Correo.enviar).not.toHaveBeenCalled();
  expect(DAO.finalizar).toHaveBeenCalledWith('12', 'fallido', null, expect.any(String));
});
test.each([
  ['EAUTH', undefined, 'fallido'], ['EENVELOPE', 550, 'fallido'],
  ['ETIMEDOUT', undefined, 'incierto'], ['ESOCKET', undefined, 'incierto'],
])('clasifica %s sin exponer mensajes internos', async (code, responseCode, estado) => {
  Correo.enviar.mockRejectedValue(Object.assign(new Error('PASSWORD=secreto'), { code, responseCode }));
  await Service.procesarUno();
  expect(DAO.finalizar).toHaveBeenCalledWith('12', estado, null, expect.not.stringContaining('secreto'));
});
test('si falla guardar la aceptación no se repite ni se reclasifica el envío', async () => {
  DAO.finalizar.mockRejectedValue(new Error('Base de datos desconectada'));
  await expect(Service.procesarUno()).rejects.toThrow('Base de datos desconectada');
  expect(DAO.finalizar).toHaveBeenCalledTimes(1);
  expect(Correo.enviar).toHaveBeenCalledTimes(1);
});

test.each([['ECONNECTION', undefined], ['EDNS', undefined], ['EMESSAGE', 451]])(
  'solicita reintento solo para fallos temporales seguros: %s', async (code, responseCode) => {
    Correo.enviar.mockRejectedValue(Object.assign(new Error('Falla temporal'), { code, responseCode }));
    await Service.procesarUno();
    expect(DAO.finalizar).toHaveBeenCalledWith('12', 'fallido', null, expect.any(String), true);
  },
);
