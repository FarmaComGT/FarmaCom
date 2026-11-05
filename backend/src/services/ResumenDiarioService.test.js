jest.mock('../daos/ResumenDiarioDAO');
const DAO = require('../daos/ResumenDiarioDAO');
const Service = require('./ResumenDiarioService');

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-05T03:00:00Z'));
  DAO.obtener.mockReset();
  DAO.obtener.mockResolvedValue({ corte: '2026-11-05T03:00:00Z', sucursales: [], productos: [], cajas: [] });
});
afterEach(() => jest.useRealTimers());

test('usa el día de Guatemala aunque UTC ya esté en el siguiente día', async () => {
  const reporte = await Service.obtener();
  expect(DAO.obtener).toHaveBeenCalledWith({ fecha: '2026-11-04', sucursales: undefined });
  expect(reporte.resumen).toMatchObject({ ingresos: 0, ticket_promedio: 0, margen_bruto: 0 });
});

test.each(['2026-02-30', '2026-11-05', 'incorrecta'])('rechaza fecha inválida o futura: %s', async (fecha) => {
  await expect(Service.obtener({ fecha })).rejects.toMatchObject({ status: 400 });
  expect(DAO.obtener).not.toHaveBeenCalled();
});

test.each([[], [0], ['1'], [2147483648]].map((ids) => [ids]))('rechaza selección inválida: %j', async (sucursales) => {
  await expect(Service.obtener({ sucursales })).rejects.toMatchObject({ status: 400 });
});

test('no compensa faltantes con sobrantes y conserva valores pendientes', async () => {
  DAO.obtener.mockResolvedValue({ corte: new Date(), productos: [],
    sucursales: [{ ingresos: '0.10', ventas: 1, costo: '0.05', utilidad_bruta: '0.05' },
      { ingresos: '0.20', ventas: 1, costo: '0.10', utilidad_bruta: '0.10' }],
    cajas: [{ estado: 'abierta', diferencia_efectivo: null, efectivo_contado: null },
      { estado: 'cerrada', diferencia_efectivo: '-100.00' },
      { estado: 'cerrada', diferencia_efectivo: '100.00' }],
  });
  const reporte = await Service.obtener();
  expect(reporte.estado).toBe('provisional');
  expect(reporte.resumen).toMatchObject({ ingresos: 0.3, utilidad_bruta: 0.15,
    ticket_promedio: 0.15, margen_bruto: 50, faltantes: 100, sobrantes: 100,
    sesiones_abiertas: 1, sesiones_cerradas: 2 });
  expect(reporte.cajas[0].efectivo_contado).toBeNull();
});

test('rechaza sucursales inexistentes', async () => {
  await expect(Service.obtener({ sucursales: [1] })).rejects.toMatchObject({ status: 404 });
});
