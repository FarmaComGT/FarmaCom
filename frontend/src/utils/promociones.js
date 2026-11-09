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

export const cantidadPromocion = (cantidad) => `${new Intl.NumberFormat('es-GT').format(cantidad)} ${Number(cantidad) === 1 ? 'unidad' : 'unidades'}`;
export const nombrePromocion = (p) => p.nombre?.trim() || `${p.nombre_comercial || 'Producto'} · desde ${cantidadPromocion(p.cantidad_minima)}`;
export const estadoPromocion = (p, hoy = new Date()) => {
  if (!p.activo) return 'desactivada';
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (String(p.fecha_inicio).slice(0, 10) > fecha) return 'programada';
  if (p.fecha_fin && String(p.fecha_fin).slice(0, 10) < fecha) return 'finalizada';
  if (p.cantidad_maxima != null && Number(p.cantidad_disponible) === 0) return 'agotada';
  return 'vigente';
};
