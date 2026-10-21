import { describe, expect, it } from 'vitest';
import { actualizarPreciosLote, calcularMargenGanancia, calcularPrecioVenta } from './lotePrecios.js';

describe('reglas de precios de lote', () => {
  it('calcula el precio de venta desde compra y margen', () => {
    expect(calcularPrecioVenta('10', '25')).toBe('12.50');
  });
  it('calcula el margen desde compra y venta', () => {
    expect(calcularMargenGanancia('10', '12.50')).toBe('25.0000');
    expect(calcularMargenGanancia('0', '12.50')).toBe('');
  });
  it('mantiene sincronizados los campos relacionados', () => {
    expect(actualizarPreciosLote({ precio_compra: '8', precio_venta: '' }, 'margen_ganancia', '50'))
      .toEqual(expect.objectContaining({ margen_ganancia: '50', precio_venta: '12.00' }));
  });
});
