import { describe, expect, it } from 'vitest';
import { construirPayloadVenta } from './useFlujoVenta';

describe('construirPayloadVenta', () => {
  it('reparte automáticamente la cantidad entre lotes mediante FEFO', () => {
    const payload = construirPayloadVenta({
      sucursalId: 1,
      sesionCajaId: 9,
      clienteId: null,
      items: [{
        id_producto: 5,
        nombre_comercial: 'Paracetamol',
        cantidad: 8,
        lotes: [
          { id_lote: 12, fecha_vencimiento: null, stock_disponible: 10 },
          { id_lote: 11, fecha_vencimiento: '2027-08-01', stock_disponible: 5 },
          { id_lote: 10, fecha_vencimiento: '2027-02-01', stock_disponible: 3 },
        ],
      }],
    });

    expect(payload).toEqual({
      id_sucursal: 1,
      id_sesion_caja: 9,
      id_cliente: null,
      detalles: [
        { id_lote: 10, cantidad: 3 },
        { id_lote: 11, cantidad: 5 },
      ],
    });
  });

  it('mantiene compatibilidad con un artículo que ya representa un lote', () => {
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
});
