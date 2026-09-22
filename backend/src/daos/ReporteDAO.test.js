jest.mock('../database/db');

const pool = require('../database/db');
const ReporteDAO = require('./ReporteDAO');

describe('ReporteDAO', () => {
  it('calcula el resumen usando solo ventas completadas', async () => {
    const resumen = {
      ingresos_totales: '350.50',
      total_ventas: 12,
      ticket_promedio: '29.21',
      unidades_vendidas: 28,
    };
    pool.query.mockResolvedValue({ rows: [resumen] });

    const resultado = await ReporteDAO.obtenerResumenVentas({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('completada');
    expect(consulta).toContain('v.id_sucursal = $1');
    expect(consulta).toContain('America/Guatemala');
    expect(consulta).toContain('AVG(vf.total)');
    expect(consulta).toContain('SUM(dv.cantidad)');
    expect(consulta).toContain('CROSS JOIN resumen_unidades');
    expect(valores).toEqual([2, '2026-08-01', '2026-08-31']);
    expect(resultado).toEqual(resumen);
  });

  it('permite consultar el resumen global sin filtros opcionales', async () => {
    pool.query.mockResolvedValue({
      rows: [{
        ingresos_totales: '0.00',
        total_ventas: 0,
        ticket_promedio: '0.00',
        unidades_vendidas: 0,
      }],
    });

    await ReporteDAO.obtenerResumenVentas();

    expect(pool.query.mock.calls[0][1]).toEqual([null, null, null]);
  });

  it('genera una serie diaria y conserva períodos sin ventas', async () => {
    const periodos = [
      {
        periodo: '2026-08-01',
        ingresos: '0.00',
        total_ventas: 0,
        ticket_promedio: '0.00',
        unidades_vendidas: 0,
      },
    ];
    pool.query.mockResolvedValue({ rows: periodos });

    const resultado = await ReporteDAO.obtenerSerieVentas({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-07',
      agrupacion: 'dia',
    });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('GENERATE_SERIES');
    expect(consulta).toContain('1 day');
    expect(consulta).toContain('America/Guatemala');
    expect(consulta).toContain('ventas_agrupadas');
    expect(consulta).toContain('unidades_agrupadas');
    expect(consulta).toContain('LEFT JOIN ventas_agrupadas');
    expect(consulta).toContain('COALESCE(va.ingresos, 0)');
    expect(valores).toEqual([2, '2026-08-01', '2026-08-07']);
    expect(resultado).toEqual(periodos);
  });

  it.each([
    ['semana', 'week', '1 week'],
    ['mes', 'month', '1 month'],
  ])('configura correctamente la agrupación %s', async (agrupacion, unidad, paso) => {
    pool.query.mockResolvedValue({ rows: [] });

    await ReporteDAO.obtenerSerieVentas({
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      agrupacion,
    });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain(unidad);
    expect(consulta).toContain(paso);
    expect(valores).toEqual([null, '2026-08-01', '2026-08-31']);
  });

  it('calcula ventas, ingresos y porcentajes por método de pago', async () => {
    const metodos = [
      {
        metodo_pago: 'efectivo',
        total_ventas: 6,
        ingresos: '300.00',
        porcentaje_ingresos: '60.00',
      },
      {
        metodo_pago: 'tarjeta',
        total_ventas: 4,
        ingresos: '200.00',
        porcentaje_ingresos: '40.00',
      },
    ];
    pool.query.mockResolvedValue({ rows: metodos });

    const resultado = await ReporteDAO.obtenerMetodosPago({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('efectivo');
    expect(consulta).toContain('tarjeta');
    expect(consulta).toContain('completada');
    expect(consulta).toContain('America/Guatemala');
    expect(consulta).toContain('porcentaje_ingresos');
    expect(consulta).toContain('WHEN it.total = 0');
    expect(valores).toEqual([2, '2026-08-01', '2026-08-31']);
    expect(resultado).toEqual(metodos);
  });

  it('conserva ambos métodos cuando no existen ventas', async () => {
    const metodos = [
      {
        metodo_pago: 'efectivo',
        total_ventas: 0,
        ingresos: '0.00',
        porcentaje_ingresos: '0.00',
      },
      {
        metodo_pago: 'tarjeta',
        total_ventas: 0,
        ingresos: '0.00',
        porcentaje_ingresos: '0.00',
      },
    ];
    pool.query.mockResolvedValue({ rows: metodos });

    const resultado = await ReporteDAO.obtenerMetodosPago();

    expect(pool.query.mock.calls[0][1]).toEqual([null, null, null]);
    expect(resultado).toEqual(metodos);
  });

  it('ordena el top por cantidad vendida y aplica los filtros', async () => {
    const productos = [
      {
        id_producto: 4,
        cantidad_vendida: 25,
        ingresos_generados: '200.00',
      },
    ];
    pool.query.mockResolvedValue({ rows: productos });

    const resultado = await ReporteDAO.obtenerTopProductos({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      limite: 7,
      criterio: 'cantidad',
    });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('completada');
    expect(consulta).toContain('America/Guatemala');
    expect(consulta).toContain('SUM(dv.cantidad)');
    expect(consulta).toContain('SUM(dv.subtotal)');
    expect(consulta).toContain('ORDER BY cantidad_vendida DESC');
    expect(consulta).toContain('LIMIT $4');
    expect(valores).toEqual([2, '2026-08-01', '2026-08-31', 7]);
    expect(resultado).toEqual(productos);
  });

  it('permite ordenar el top global por ingresos', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await ReporteDAO.obtenerTopProductos({ criterio: 'ingresos' });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('ORDER BY ingresos_generados DESC');
    expect(valores).toEqual([null, null, null, 5]);
  });

  it('calcula ingresos, costo, utilidad y margen por sucursal', async () => {
    const rentabilidad = [{
      id_sucursal: 2,
      nombre_sucursal: 'Sucursal Centro',
      ingresos: '500.00',
      costo: '300.00',
      utilidad: '200.00',
      margen: '40.00',
    }];
    pool.query.mockResolvedValue({ rows: rentabilidad });

    const resultado = await ReporteDAO.obtenerRentabilidad({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain("v.estado = 'completada'");
    expect(consulta).toContain('SUM(dv.subtotal)');
    expect(consulta).toContain('SUM(dv.cantidad * dv.costo_unitario)');
    expect(consulta).toContain('America/Guatemala');
    expect(consulta).toContain('LEFT JOIN rentabilidad_sucursal');
    expect(consulta).toContain('WHEN COALESCE(rs.ingresos, 0) = 0');
    expect(valores).toEqual([2, '2026-08-01', '2026-08-31']);
    expect(resultado).toEqual(rentabilidad);
  });

  it('permite consultar la rentabilidad de todas las sucursales', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await ReporteDAO.obtenerRentabilidad();

    expect(pool.query.mock.calls[0][1]).toEqual([null, null, null]);
  });
});
