jest.mock('../daos/ResumenDiarioGestionDAO');
jest.mock('./ResumenDiarioService');
jest.mock('./ResumenDiarioPdfService');
const DAO = require('../daos/ResumenDiarioGestionDAO');
const Resumen = require('./ResumenDiarioService');
const Pdf = require('./ResumenDiarioPdfService');
const Service = require('./ResumenDiarioGestionService');

beforeEach(() => jest.resetAllMocks());
const config = { correo_destinatario: 'dueno@example.com', hora_envio: '21:30',
  automatico: true, todas_sucursales: false, sucursales: [3, 1, 3] };

test('empieza desactivado y con todas las sucursales', async () => {
  DAO.obtenerConfiguracion.mockResolvedValue(null);
  expect(await Service.obtenerConfiguracion(7)).toMatchObject({
    automatico: false, todas_sucursales: true, sucursales: [], zona_horaria: 'America/Guatemala',
  });
});
test('deduplica la selección y conserva la configuración del dueño', async () => {
  DAO.guardarConfiguracion.mockImplementation(async (_id, datos) => datos);
  const result = await Service.guardarConfiguracion(7, config);
  expect(DAO.guardarConfiguracion).toHaveBeenCalledWith(7, { ...config, sucursales: [1, 3] });
  expect(result.zona_horaria).toBe('America/Guatemala');
});
test('limpia la selección anterior cuando se incluyen todas las sucursales', async () => {
  await Service.guardarConfiguracion(7, { ...config, todas_sucursales: true });
  expect(DAO.guardarConfiguracion).toHaveBeenCalledWith(7, expect.objectContaining({ sucursales: [] }));
});
test.each([
  [{ ...config, correo_destinatario: '' }, 'correo'],
  [{ ...config, sucursales: [] }, 'sucursal'],
])('rechaza configuración incompleta: %j', async (datos, mensaje) => {
  await expect(Service.guardarConfiguracion(7, datos)).rejects.toThrow(mensaje);
  expect(DAO.guardarConfiguracion).not.toHaveBeenCalled();
});
test('guarda solo los datos del corte usando la selección configurada', async () => {
  const datos = { fecha: '2026-11-04', estado: 'provisional' };
  DAO.obtenerConfiguracion.mockResolvedValue({ ...config, sucursales: [1, 3] });
  Resumen.obtener.mockResolvedValue(datos);
  DAO.guardarReporte.mockResolvedValue({ id_reporte: '12' });
  await expect(Service.crearReporte(7, '2026-11-04')).resolves.toEqual({ id_reporte: '12' });
  expect(Resumen.obtener).toHaveBeenCalledWith({ fecha: '2026-11-04', sucursales: [1, 3] });
  expect(DAO.guardarReporte).toHaveBeenCalledWith(7, datos);
  expect(Pdf.generar).not.toHaveBeenCalled();
});
test('una descarga histórica genera el PDF desde los datos guardados sin consultar ventas', async () => {
  const datos = { fecha: '2026-11-04', resumen: { ingresos: 100 } };
  const guardado = { id_reporte: '12', datos };
  const pdf = Buffer.from('%PDF generado en memoria');
  DAO.obtenerReporte.mockResolvedValue(guardado);
  Pdf.generar.mockResolvedValue(pdf);
  expect(await Service.obtenerReporte(7, '12', true)).toEqual({ id_reporte: '12', pdf });
  expect(DAO.obtenerReporte).toHaveBeenCalledWith(7, '12');
  expect(Resumen.obtener).not.toHaveBeenCalled();
  expect(Pdf.generar).toHaveBeenCalledWith(datos);
  expect(DAO.guardarReporte).not.toHaveBeenCalled();
});
test('un reporte ajeno o inexistente responde como no encontrado', async () => {
  DAO.obtenerReporte.mockResolvedValue(null);
  await expect(Service.obtenerReporte(7, '12')).rejects.toMatchObject({ status: 404 });
});
test('una falla al descargar el PDF no modifica la copia histórica', async () => {
  DAO.obtenerReporte.mockResolvedValue({ datos: { fecha: '2026-11-04' } });
  Pdf.generar.mockRejectedValue(new Error('No se pudo generar'));
  await expect(Service.obtenerReporte(7, '12', true)).rejects.toThrow('No se pudo generar');
  expect(DAO.guardarReporte).not.toHaveBeenCalled();
});

test('consultar los datos del historial no genera un PDF', async () => {
  const guardado = { id_reporte: '12', datos: { fecha: '2026-11-04' } };
  DAO.obtenerReporte.mockResolvedValue(guardado);
  expect(await Service.obtenerReporte(7, '12')).toBe(guardado);
  expect(Pdf.generar).not.toHaveBeenCalled();
});
