jest.mock('../services/ReporteService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const ReporteService = require('../services/ReporteService');
const ReporteController = require('./ReporteController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ReporteController', () => {
  beforeEach(() => {
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
  });

  it('responde con el resumen de ventas solicitado', async () => {
    const resumen = {
      ingresos_totales: '450.00',
      total_ventas: 9,
      ticket_promedio: '50.00',
      unidades_vendidas: 22,
    };
    const query = { id_sucursal: 1 };
    ReporteService.obtenerResumenVentas.mockResolvedValue(resumen);
    const req = { query };
    const res = mockResponse();

    await ReporteController.obtenerResumenVentas(req, res);

    expect(ReporteService.obtenerResumenVentas).toHaveBeenCalledWith(query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(resumen);
  });

  it('responde con la serie de ventas solicitada', async () => {
    const periodos = [
      {
        periodo: '2026-08-01',
        ingresos: '450.00',
        total_ventas: 9,
        ticket_promedio: '50.00',
        unidades_vendidas: 22,
      },
    ];
    const query = {
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      agrupacion: 'dia',
    };
    ReporteService.obtenerSerieVentas.mockResolvedValue(periodos);
    const req = { query };
    const res = mockResponse();

    await ReporteController.obtenerSerieVentas(req, res);

    expect(ReporteService.obtenerSerieVentas).toHaveBeenCalledWith(query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(periodos);
  });

  it('responde con la distribución por método de pago', async () => {
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
    const query = { id_sucursal: 1 };
    ReporteService.obtenerMetodosPago.mockResolvedValue(metodos);
    const req = { query };
    const res = mockResponse();

    await ReporteController.obtenerMetodosPago(req, res);

    expect(ReporteService.obtenerMetodosPago).toHaveBeenCalledWith(query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(metodos);
  });

  it('no consulta el servicio cuando los filtros son inválidos', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'fecha_hasta debe ser igual o posterior a fecha_desde' }],
    });
    const req = { query: {} };
    const res = mockResponse();

    await ReporteController.obtenerResumenVentas(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(ReporteService.obtenerResumenVentas).not.toHaveBeenCalled();
  });

  it('responde con el top de productos solicitado', async () => {
    const productos = [
      {
        id_producto: 4,
        nombre_comercial: 'Analgésico',
        cantidad_vendida: 25,
        ingresos_generados: '200.00',
      },
    ];
    const query = { limite: 5, criterio: 'cantidad' };
    ReporteService.obtenerTopProductos.mockResolvedValue(productos);
    const req = { query };
    const res = mockResponse();

    await ReporteController.obtenerTopProductos(req, res);

    expect(ReporteService.obtenerTopProductos).toHaveBeenCalledWith(query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(productos);
  });

  it('responde con la rentabilidad por sucursal', async () => {
    const rentabilidad = [{
      id_sucursal: 1,
      ingresos: '500.00',
      costo: '300.00',
      utilidad: '200.00',
      margen: '40.00',
    }];
    const query = {
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
    };
    ReporteService.obtenerRentabilidad.mockResolvedValue(rentabilidad);
    const req = { query };
    const res = mockResponse();

    await ReporteController.obtenerRentabilidad(req, res);

    expect(ReporteService.obtenerRentabilidad).toHaveBeenCalledWith(query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(rentabilidad);
  });
});
