const {
  aCentavos,
  aMonto,
  calcularDetalles,
  calcularCobroEfectivo,
} = require('./VentaMonetariaService');

describe('VentaMonetariaService', () => {
  it('calcula los importes históricos y el total en centavos', () => {
    const resultado = calcularDetalles([
      {
        id_lote: 2,
        cantidad: 2,
        lote: { id_producto: 2, precio_venta: '7.50', precio_compra: '4.10' },
      },
      {
        id_lote: 1,
        cantidad: 1,
        lote: { id_producto: 1, precio_venta: '10.00', precio_compra: '6.25' },
      },
    ]);

    expect(resultado).toEqual({
      totalCentavos: 2500,
      detallesCalculados: [
        {
          id_lote: 2,
          cantidad: 2,
          precio_unitario: '7.50',
          costo_unitario: '4.10',
        },
        {
          id_lote: 1,
          cantidad: 1,
          precio_unitario: '10.00',
          costo_unitario: '6.25',
        },
      ],
    });
  });

  it('usa el precio promocional como precio unitario histórico', () => {
    const promociones = new Map([
      [1, { id_promocion: 9, precio_promocion: '6.25' }],
    ]);

    expect(calcularDetalles([{
      id_lote: 3,
      cantidad: 4,
      lote: { id_producto: 1, precio_venta: '8.50', precio_compra: '5.00' },
    }], promociones)).toEqual({
      totalCentavos: 2500,
      detallesCalculados: [{
        id_lote: 3,
        cantidad: 4,
        precio_unitario: '6.25',
        costo_unitario: '5.00',
      }],
    });
  });

  it('calcula el cambio y mantiene el error por monto insuficiente', () => {
    expect(calcularCobroEfectivo('30.00', 2500)).toEqual({
      recibidoCentavos: 3000,
      cambioCentavos: 500,
    });
    expect(aCentavos('7.50')).toBe(750);
    expect(aMonto(750)).toBe('7.50');

    expect(() => calcularCobroEfectivo('20.00', 2500)).toThrow(
      'El monto recibido es insuficiente. El total es Q25.00',
    );
  });
});
