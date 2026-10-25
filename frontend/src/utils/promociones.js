export const obtenerPrecioVentaMinimoDisponible = (lotes = [], idSucursal) => {
  if (!idSucursal) return null;

  const precios = lotes
    .filter((lote) => (
      Number(lote.id_sucursal) === Number(idSucursal)
      && Number(lote.stock_actual ?? lote.stock_disponible) > 0
      && lote.estado_vencimiento !== 'vencido'
      && Number(lote.precio_venta) > 0
    ))
    .map((lote) => Number(lote.precio_venta));

  return precios.length > 0 ? Math.min(...precios) : null;
};
