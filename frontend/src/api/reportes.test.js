import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  obtenerRentabilidad,
  construirParametrosReporte,
  obtenerMetodosPago,
  obtenerResumenVentas,
  obtenerSerieVentas,
  obtenerTopProductos,
} from './reportes';

vi.mock('./axios', () => ({
  default: { get: vi.fn() },
}));

describe('API de reportes', () => {
  it('consulta rentabilidad con fechas y sucursal y normaliza los decimales', async () => {
    api.get.mockResolvedValue({ data: [{ id_sucursal: '2', nombre_sucursal: 'Centro', ingresos: '500.00', costo: '300.00', utilidad: '200.00', margen: '40.00' }] });
    const signal = new AbortController().signal;
    const filtros = { id_sucursal: 2, fecha_desde: '2026-08-01', fecha_hasta: '2026-08-31' };
    const resultado = await obtenerRentabilidad({ ...filtros, agrupacion: 'dia', criterio: 'cantidad' }, { signal });
    expect(api.get).toHaveBeenCalledWith('/reportes/rentabilidad', { params: filtros, signal });
    expect(resultado).toEqual([{ id_sucursal: 2, nombre_sucursal: 'Centro', ingresos: 500, costo: 300, utilidad: 200, margen: 40 }]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('omite filtros vacíos y parámetros desconocidos', () => {
    expect(construirParametrosReporte({
      id_sucursal: 2,
      fecha_desde: '',
      fecha_hasta: null,
      criterio: 'ingresos',
    })).toEqual({ id_sucursal: 2 });
  });

  it('obtiene y normaliza el resumen de ventas', async () => {
    api.get.mockResolvedValue({
      data: {
        ingresos_totales: '425.50',
        total_ventas: '8',
        ticket_promedio: '53.19',
        unidades_vendidas: '21',
      },
    });

    const resultado = await obtenerResumenVentas({
      id_sucursal: 2,
      fecha_desde: '2026-08-01',
      desconocido: 'ignorar',
    });

    expect(api.get).toHaveBeenCalledWith('/reportes/ventas/resumen', {
      params: {
        id_sucursal: 2,
        fecha_desde: '2026-08-01',
      },
    });
    expect(resultado.ingresos_totales).toBe(425.5);
    expect(resultado.total_ventas).toBe(8);
  });

  it('envía la agrupación y la señal al solicitar la serie', async () => {
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: [] });

    await obtenerSerieVentas({
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      agrupacion: 'semana',
    }, { signal: controller.signal });

    expect(api.get).toHaveBeenCalledWith('/reportes/ventas/serie', {
      params: {
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
        agrupacion: 'semana',
      },
      signal: controller.signal,
    });
  });

  it('consulta y normaliza los métodos de pago', async () => {
    api.get.mockResolvedValue({
      data: [{
        metodo_pago: 'tarjeta',
        total_ventas: '4',
        ingresos: '300.00',
        porcentaje_ingresos: '75.00',
      }],
    });

    const resultado = await obtenerMetodosPago({ id_sucursal: 1 });

    expect(api.get).toHaveBeenCalledWith('/reportes/ventas/metodos-pago', {
      params: { id_sucursal: 1 },
    });
    expect(resultado[0]).toMatchObject({
      total_ventas: 4,
      ingresos: 300,
      porcentaje_ingresos: 75,
    });
  });

  it('envía únicamente los filtros aceptados al top de productos', async () => {
    api.get.mockResolvedValue({
      data: [{
        id_producto: '9',
        nombre_comercial: 'Producto de prueba',
        cantidad_vendida: '14',
        ingresos_generados: '280.00',
      }],
    });

    const resultado = await obtenerTopProductos({
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-31',
      limite: 5,
      criterio: 'ingresos',
      agrupacion: 'dia',
    });

    expect(api.get).toHaveBeenCalledWith('/reportes/productos/top', {
      params: {
        fecha_desde: '2026-08-01',
        fecha_hasta: '2026-08-31',
        limite: 5,
        criterio: 'ingresos',
      },
    });
    expect(resultado[0]).toMatchObject({
      id_producto: 9,
      cantidad_vendida: 14,
      ingresos_generados: 280,
    });
  });
});
