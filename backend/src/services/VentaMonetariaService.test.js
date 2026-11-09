const {
  aCentavos,
  aMonto,
  calcularDetalles,
  calcularCobroEfectivo,
} = require('./VentaMonetariaService');

describe('VentaMonetariaService', () => {
  it('reparte el último cupo entre lotes y conserva precios exactos sin prorratear', () => {
    const resultado = calcularDetalles([
      { id_lote: 9, cantidad: 4, lote: { id_producto: 5, precio_venta: '10.01', precio_compra: '5.00' } },
      { id_lote: 2, cantidad: 2, lote: { id_producto: 5, precio_venta: '11.00', precio_compra: '5.00' } },
    ], new Map([[5, { id_promocion: 7, precio_promocion: '8.01', cantidad_disponible: 3 }]]));
    expect(resultado.totalCentavos).toBe(5406);
    expect(resultado.detallesCalculados).toEqual([
      { id_lote: 9, cantidad: 1, id_promocion: 7, precio_regular: '10.01', precio_unitario: '8.01', costo_unitario: '5.00' },
      { id_lote: 9, cantidad: 3, id_promocion: null, precio_regular: '10.01', precio_unitario: '10.01', costo_unitario: '5.00' },
      { id_lote: 2, cantidad: 2, id_promocion: 7, precio_regular: '11.00', precio_unitario: '8.01', costo_unitario: '5.00' },
    ]);
  });
  it('cobra normal cuando el cupo está agotado', () => {
    expect(calcularDetalles([{ id_lote: 1, cantidad: 5, lote: { id_producto: 1, precio_venta: 10, precio_compra: 5 } }],
      new Map([[1, { id_promocion: 1, precio_promocion: 8, cantidad_disponible: 0 }]])).totalCentavos).toBe(5000);
  });
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
          id_promocion: null,
          precio_regular: '7.50',
          precio_unitario: '7.50',
          costo_unitario: '4.10',
        },
        {
          id_lote: 1,
          cantidad: 1,
          id_promocion: null,
          precio_regular: '10.00',
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
        id_promocion: 9,
        precio_regular: '8.50',
        precio_unitario: '6.25',
        costo_unitario: '5.00',
        id_promocion: 9,
      }],
    });
  });

  it('nunca usa una promoción más cara que el precio normal del lote', () => {
    const promociones = new Map([
      [1, { id_promocion: 9, precio_promocion: '9.50' }],
    ]);

    expect(calcularDetalles([{
      id_lote: 4,
      cantidad: 2,
      lote: { id_producto: 1, precio_venta: '8.00', precio_compra: '4.00' },
    }], promociones)).toEqual({
      totalCentavos: 1600,
      detallesCalculados: [{
        id_lote: 4,
        cantidad: 2,
        id_promocion: null,
        precio_regular: '8.00',
        precio_unitario: '8.00',
        costo_unitario: '4.00',
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

  it('aplica la promoción a cada lote del mismo producto en el carrito', () => {
    const { totalCentavos, detallesCalculados } = calcularDetalles([
      { id_lote: 1, cantidad: 2, lote: { id_producto: 5, precio_venta: '10.00', precio_compra: '6.00' } },
      { id_lote: 3, cantidad: 1, lote: { id_producto: 5, precio_venta: '8.00', precio_compra: '5.00' } },
    ], new Map([[5, { precio_promocion: '8.50' }]]));

    expect(detallesCalculados.map(({ precio_unitario: precio }) => precio)).toEqual(['8.50', '8.00']);
    expect(totalCentavos).toBe(2500);
  });

  it('rechaza un carrito cuyo total es cero', () => {
    expect(() => calcularDetalles([
      { id_lote: 1, cantidad: 1, lote: { id_producto: 1, precio_venta: '0', precio_compra: '0' } },
    ])).toThrow('El total de la venta debe ser mayor a cero');
  });

  it('rechaza un carrito que supera el monto máximo permitido', () => {
    expect(() => calcularDetalles([
      { id_lote: 1, cantidad: 2, lote: { id_producto: 1, precio_venta: '9999999999.99', precio_compra: '1' } },
    ])).toThrow('El total de la venta supera el monto maximo permitido');
  });
});
