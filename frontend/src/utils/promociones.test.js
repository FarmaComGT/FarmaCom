import { describe, expect, it } from 'vitest';
import { obtenerPrecioVentaMinimoDisponible } from './promociones';

describe('utilidades de promociones', () => {
  it('obtiene el menor precio entre los lotes vendibles de la sucursal', () => {
    const lotes = [
      { id_sucursal: 1, stock_actual: 5, precio_venta: '15.00', estado_vencimiento: 'normal' },
      { id_sucursal: 1, stock_actual: 3, precio_venta: '12.50', estado_vencimiento: 'normal' },
      { id_sucursal: 2, stock_actual: 4, precio_venta: '9.00', estado_vencimiento: 'normal' },
      { id_sucursal: 1, stock_actual: 0, precio_venta: '8.00', estado_vencimiento: 'normal' },
      { id_sucursal: 1, stock_actual: 2, precio_venta: '7.00', estado_vencimiento: 'vencido' },
    ];

    expect(obtenerPrecioVentaMinimoDisponible(lotes, 1)).toBe(12.5);
  });

  it('devuelve null cuando no hay un precio vendible de referencia', () => {
    expect(obtenerPrecioVentaMinimoDisponible([], 1)).toBeNull();
    expect(obtenerPrecioVentaMinimoDisponible([
      { id_sucursal: 1, stock_actual: 0, precio_venta: 10 },
    ], 1)).toBeNull();
  });
});
