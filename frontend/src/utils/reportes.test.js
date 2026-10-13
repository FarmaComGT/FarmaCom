import { describe, expect, it } from 'vitest';
import {
  formatearFechaReporte,
  formatearMoneda,
  formatearNumero,
  formatearPeriodoReporte,
  normalizarMetodosPago,
  normalizarNumeroReporte,
  normalizarResumenVentas,
  normalizarResumenProductos,
  normalizarSerieVentas,
  normalizarTopProductos,
} from './reportes';

describe('utilidades de reportes', () => {
  it('normaliza valores numéricos y conserva un valor predeterminado seguro', () => {
    expect(normalizarNumeroReporte('125.50')).toBe(125.5);
    expect(normalizarNumeroReporte(null)).toBe(0);
    expect(normalizarNumeroReporte('sin dato', 10)).toBe(10);
  });

  it('formatea montos, cantidades y fechas para Guatemala', () => {
    expect(formatearMoneda('1234.5')).toBe('Q\u00a01,234.50');
    expect(formatearNumero('1200')).toBe('1,200');
    expect(formatearFechaReporte('2026-08-03')).toBe('03/08/2026');
    expect(formatearFechaReporte('2026-02-31')).toBe('—');
    expect(formatearFechaReporte(null)).toBe('—');
    expect(formatearPeriodoReporte('2026-08-03', 'dia')).toBe('03/08');
    expect(formatearPeriodoReporte('2026-08-03', 'semana')).toBe('03/08');
    expect(formatearPeriodoReporte('2026-08-03', 'mes')).toBe('ago 2026');
  });

  it('normaliza el resumen de ventas sin propagar valores inválidos', () => {
    expect(normalizarResumenVentas({
      ingresos_totales: '250.75',
      total_ventas: 6,
      ticket_promedio: '41.79',
      unidades_vendidas: '15',
    })).toEqual({
      ingresos_totales: 250.75,
      total_ventas: 6,
      ticket_promedio: 41.79,
      unidades_vendidas: 15,
    });

    expect(normalizarResumenVentas()).toEqual({
      ingresos_totales: 0,
      total_ventas: 0,
      ticket_promedio: 0,
      unidades_vendidas: 0,
    });
  });

  it('normaliza las colecciones usadas por las gráficas y el ranking', () => {
    expect(normalizarSerieVentas([{
      periodo: '2026-08-01',
      ingresos: '100.00',
      total_ventas: '2',
      ticket_promedio: '50.00',
      unidades_vendidas: '7',
    }])[0]).toMatchObject({
      ingresos: 100,
      total_ventas: 2,
      ticket_promedio: 50,
      unidades_vendidas: 7,
    });

    expect(normalizarMetodosPago([{
      metodo_pago: 'efectivo',
      ingresos: '75.50',
      total_ventas: '3',
      porcentaje_ingresos: '60.25',
    }])[0]).toMatchObject({
      ingresos: 75.5,
      total_ventas: 3,
      porcentaje_ingresos: 60.25,
    });

    expect(normalizarTopProductos([{
      id_producto: '4',
      cantidad_vendida: '12',
      ingresos_generados: '180.00',
    }])[0]).toMatchObject({
      id_producto: 4,
      cantidad_vendida: 12,
      ingresos_generados: 180,
    });

    expect(normalizarSerieVentas(null)).toEqual([]);
    expect(normalizarMetodosPago({})).toEqual([]);
    expect(normalizarTopProductos()).toEqual([]);
  });

  it('normaliza el resumen acumulado por producto', () => {
    expect(normalizarResumenProductos([{
      id_producto: '4',
      nombre_producto: 'Acetaminofén',
      cantidad_vendida: '15',
      suma_total: '40.00',
    }])).toEqual([{
      id_producto: 4,
      nombre_producto: 'Acetaminofén',
      cantidad_vendida: 15,
      suma_total: 40,
    }]);
    expect(normalizarResumenProductos(null)).toEqual([]);
  });
});
