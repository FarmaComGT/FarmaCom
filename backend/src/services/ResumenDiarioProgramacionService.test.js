jest.mock('../daos/ResumenDiarioProgramacionDAO');
jest.mock('./ResumenDiarioService');
jest.mock('../config/correo');
const DAO = require('../daos/ResumenDiarioProgramacionDAO');
const Resumen = require('./ResumenDiarioService');
const Config = require('../config/correo');
const { procesarProgramacion } = require('./ResumenDiarioProgramacionService');
beforeEach(() => jest.resetAllMocks());

test('conserva fecha, selección y conexión de la copia programada', async () => {
  const client = {};
  const config = { fecha: '2026-11-04', todas_sucursales: false, sucursales: [2],
    previsto_para: '2026-11-05T02:00:00Z' };
  Resumen.obtener.mockResolvedValue({ fecha: config.fecha, estado: 'provisional' });
  DAO.generarSiguiente.mockImplementationOnce(async (generar) => {
    const datos = await generar(config, client);
    expect(datos).toMatchObject({ estado: 'provisional', programacion: { previsto_para: config.previsto_para } });
    return { id_reporte: '1' };
  }).mockResolvedValue(null);
  expect(await procesarProgramacion()).toBe(1);
  expect(Resumen.obtener).toHaveBeenCalledWith({ fecha: config.fecha, sucursales: [2] }, client);
});
test('limita la recuperación a diez reportes por ciclo', async () => {
  DAO.generarSiguiente.mockResolvedValue({ id_reporte: '1' });
  expect(await procesarProgramacion()).toBe(10);
  expect(DAO.generarSiguiente).toHaveBeenCalledTimes(10);
});
test('sin SMTP válido no genera trabajos', async () => {
  Config.obtenerConfiguracionCorreo.mockImplementation(() => { throw new Error('Sin SMTP'); });
  await expect(procesarProgramacion()).rejects.toThrow('Sin SMTP');
  expect(DAO.generarSiguiente).not.toHaveBeenCalled();
});
