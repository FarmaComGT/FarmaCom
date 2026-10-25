import { describe, expect, it } from 'vitest';
import { construirPayloadVenta } from './useFlujoVenta';

describe('construirPayloadVenta', () => {
  it('envía exactamente los lotes seleccionados en el carrito', () => {
    const payload = construirPayloadVenta({
      sucursalId: 1,
      sesionCajaId: 9,
      clienteId: null,
      items: [
        { id_producto: 5, id_lote: 12, cantidad: 6 },
        { id_producto: 5, id_lote: 10, cantidad: 2 },
      ],
    });

    expect(payload).toEqual({
      id_sucursal: 1,
      id_sesion_caja: 9,
      id_cliente: null,
      detalles: [
        { id_lote: 12, cantidad: 6 },
        { id_lote: 10, cantidad: 2 },
      ],
    });
  });

  it('construye el detalle de un artículo que representa un lote', () => {
    expect(construirPayloadVenta({
      sucursalId: 1,
      sesionCajaId: 9,
      clienteId: 4,
      items: [{
        id_lote: 7,
        cantidad: 2,
        stock_disponible: 5,
      }],
    }).detalles).toEqual([{ id_lote: 7, cantidad: 2 }]);
  });

  it('rechaza un producto agrupado que no tenga un lote seleccionado', () => {
    expect(() => construirPayloadVenta({
      sucursalId: 1,
      sesionCajaId: 9,
      clienteId: null,
      items: [{ id_producto: 5, cantidad: 2, lotes: [{ id_lote: 7 }] }],
    })).toThrow('El carrito contiene productos sin lote válido.');
  });
});
