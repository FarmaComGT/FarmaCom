// El destino de regreso siempre pertenece al listado, incluso en enlaces compartidos.
export function destinoExistencias(params) {
  const destino = params.get('volver');
  return typeof destino === 'string' && /^\/inventario(?:\?|$)/.test(destino)
    ? destino : '/inventario';
}

export function destinoLotes(productoId, search, sucursalId) {
  const origen = new URLSearchParams(search);
  if (sucursalId) origen.set('sucursal', String(sucursalId));
  const detalle = new URLSearchParams();
  if (origen.get('sucursal')) detalle.set('sucursal', origen.get('sucursal'));
  // Sin lotes pertenece al resumen del producto y no es un filtro del detalle.
  if (['normal', 'poco_stock', 'agotado'].includes(origen.get('estado_stock'))) detalle.set('stock', origen.get('estado_stock'));
  if (['normal', 'proximo_a_vencer', 'vencido'].includes(origen.get('estado_vencimiento'))) detalle.set('vencimiento', origen.get('estado_vencimiento'));
  if (origen.size) detalle.set('volver', `/inventario?${origen}`);
  return `/inventario/productos/${productoId}/lotes${detalle.size ? `?${detalle}` : ''}`;
}
