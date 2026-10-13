const normalizarNumero = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

export const normalizarVentas = (ventas) => (
  Array.isArray(ventas)
    ? ventas.map((venta) => ({
      ...venta,
      id_venta: normalizarNumero(venta.id_venta),
      id_sucursal: normalizarNumero(venta.id_sucursal),
      cantidad_articulos: normalizarNumero(venta.cantidad_articulos),
      total: normalizarNumero(venta.total),
    }))
    : []
);
