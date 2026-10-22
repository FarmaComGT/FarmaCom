export const mensajeStockAgotado = (producto) => {
  const disponible = Number(producto.stock_disponible) || 0;
  return disponible === 0
    ? `No hay existencias disponibles de ${producto.nombre_comercial}.`
    : `Solo hay ${disponible} unidades disponibles en este lote.`;
};

export const validarProductoAgregable = (items, producto) => {
  const existente = items.find((item) => item.clave === producto.carritoKey);
  return Number(existente?.cantidad || 0) >= Number(producto.stock_disponible || 0)
    ? `No hay más existencias disponibles de ${producto.nombre_comercial}.`
    : null;
};

export const normalizarCantidadCarrito = (cantidad, stockDisponible) => {
  const solicitada = Number(cantidad);
  if (!Number.isFinite(solicitada)) {
    return { cantidad: null, aviso: 'Ingresa una cantidad válida.' };
  }
  const stock = Math.max(0, Number(stockDisponible) || 0);
  return {
    cantidad: Math.max(0, Math.min(Math.floor(solicitada), stock)),
    aviso: solicitada > stock ? `Solo hay ${stock} unidades disponibles en este lote.` : null,
  };
};
