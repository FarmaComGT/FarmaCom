jest.mock('../daos/ReporteDAO');

const ReporteDAO = require('../daos/ReporteDAO');
const ReporteService = require('./ReporteService');

describe('ReporteService', () => {
  it('normaliza la sucursal antes de solicitar el resumen', async () => {
    const resumen = {
      ingresos_totales: '150.00',
      total_ventas: 4,
      ticket_promedio: '37.50',
      unidades_vendidas: 11,
    };
    ReporteDAO.obtenerResumenVentas.mockResolvedValue(resumen);

    const resultado = await ReporteService.obtenerResumenVentas({
      id_sucursal: '2',
      fecha_desde: '2026-08-01',
    });

    expect(ReporteDAO.obtenerResumenVentas).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
    });
    expect(resultado).toEqual(resumen);
  });

  it('conserva los filtros de fecha para un resumen global', async () => {
    ReporteDAO.obtenerResumenVentas.mockResolvedValue({ ingresos_totales: '900.00' });

    await ReporteService.obtenerResumenVentas({
      fecha_hasta: '2026-08-31',
    });

    expect(ReporteDAO.obtenerResumenVentas).toHaveBeenCalledWith({
      fecha_hasta: '2026-08-31',
    });
  });

  it('normaliza la sucursal al solicitar la serie de ventas', async () => {
    const periodos = [{ periodo: '2026-08-01', ingresos: '100.00' }];
    ReporteDAO.obtenerSerieVentas.mockResolvedValue(periodos);

    const resultado = await ReporteService.obtenerSerieVentas({
      id_sucursal: '2',
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      agrupacion: 'mes',
    });

    expect(ReporteDAO.obtenerSerieVentas).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      agrupacion: 'mes',
    });
    expect(resultado).toEqual(periodos);
  });

  it('rechaza una serie sin el rango completo de fechas', async () => {
    await expect(
      ReporteService.obtenerSerieVentas({
        fecha_desde: '2026-08-01',
        agrupacion: 'dia',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'fecha_desde y fecha_hasta son requeridas',
    });

    expect(ReporteDAO.obtenerSerieVentas).not.toHaveBeenCalled();
  });

  it('rechaza una agrupación desconocida antes de consultar el DAO', async () => {
    await expect(
      ReporteService.obtenerSerieVentas({
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
        agrupacion: 'trimestre',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'La agrupación debe ser dia, semana o mes',
    });

    expect(ReporteDAO.obtenerSerieVentas).not.toHaveBeenCalled();
  });

  it('normaliza la sucursal al solicitar métodos de pago', async () => {
    const metodos = [{ metodo_pago: 'efectivo', total_ventas: 3 }];
    ReporteDAO.obtenerMetodosPago.mockResolvedValue(metodos);

    const resultado = await ReporteService.obtenerMetodosPago({
      id_sucursal: '2',
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });

    expect(ReporteDAO.obtenerMetodosPago).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });
    expect(resultado).toEqual(metodos);
  });

  it('aplica los valores predeterminados al top de productos', async () => {
    const productos = [{ id_producto: 1, cantidad_vendida: 10 }];
    ReporteDAO.obtenerTopProductos.mockResolvedValue(productos);

    const resultado = await ReporteService.obtenerTopProductos({
      id_sucursal: '2',
      fecha_desde: '2026-08-01',
    });

    expect(ReporteDAO.obtenerTopProductos).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      limite: 5,
      criterio: 'cantidad',
    });
    expect(resultado).toEqual(productos);
  });

  it('conserva el criterio de ingresos y el límite solicitado', async () => {
    ReporteDAO.obtenerTopProductos.mockResolvedValue([]);

    await ReporteService.obtenerTopProductos({
      limite: 10,
      criterio: 'ingresos',
    });

    expect(ReporteDAO.obtenerTopProductos).toHaveBeenCalledWith({
      limite: 10,
      criterio: 'ingresos',
    });
  });

  it('rechaza un criterio desconocido antes de consultar el DAO', async () => {
    await expect(
      ReporteService.obtenerTopProductos({ criterio: 'margen' }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'El criterio debe ser cantidad o ingresos',
    });

    expect(ReporteDAO.obtenerTopProductos).not.toHaveBeenCalled();
  });

  it('normaliza la sucursal al solicitar la rentabilidad', async () => {
    const rentabilidad = [{ id_sucursal: 2, utilidad: '200.00' }];
    ReporteDAO.obtenerRentabilidad.mockResolvedValue(rentabilidad);

    const resultado = await ReporteService.obtenerRentabilidad({
      id_sucursal: '2',
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });

    expect(ReporteDAO.obtenerRentabilidad).toHaveBeenCalledWith({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    });
    expect(resultado).toEqual(rentabilidad);
  });
});
