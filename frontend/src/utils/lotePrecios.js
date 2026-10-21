export const formatoDecimal = (valor, decimales = 2) => (
  Number.isFinite(valor) ? valor.toFixed(decimales) : ''
);

export const calcularPrecioVenta = (precioCompra, margen) => {
  if (margen === '') return '';
  return formatoDecimal(Number(precioCompra) * (1 + Number(margen) / 100), 2);
};

export const calcularMargenGanancia = (precioCompra, precioVenta) => {
  const compra = Number(precioCompra);
  if (precioVenta === '' || compra <= 0) return '';
  return formatoDecimal(((Number(precioVenta) / compra) - 1) * 100, 4);
};

export const actualizarPreciosLote = (formulario, campo, valor) => {
  if (campo === 'margen_ganancia') {
    return {
      ...formulario,
      margen_ganancia: valor,
      precio_venta: calcularPrecioVenta(formulario.precio_compra, valor),
    };
  }
  if (campo === 'precio_venta') {
    return {
      ...formulario,
      precio_venta: valor,
      margen_ganancia: calcularMargenGanancia(formulario.precio_compra, valor),
    };
  }
  if (campo === 'precio_compra') {
    return {
      ...formulario,
      precio_compra: valor,
      margen_ganancia: calcularMargenGanancia(valor, formulario.precio_venta),
    };
  }
  return { ...formulario, [campo]: valor };
};
