export const FILTROS_INVENTARIO_INICIALES = {
  id_categoria: '',
  estado_stock: '',
  estado_vencimiento: '',
  activo: '',
};

const incluyeTexto = (valor, termino) => (
  String(valor || '').toLocaleLowerCase('es-GT').includes(termino)
);

export const filtrarProductosInventario = (
  productos,
  busqueda,
  filtros = FILTROS_INVENTARIO_INICIALES,
) => {
  const termino = busqueda.trim().toLocaleLowerCase('es-GT');

  return (productos || []).filter((producto) => {
    const coincideBusqueda = !termino
      || incluyeTexto(producto.nombre_comercial, termino)
      || incluyeTexto(producto.nombre_generico, termino)
      || incluyeTexto(producto.codigo, termino);
    const coincideCategoria = !filtros.id_categoria
      || String(producto.id_categoria) === String(filtros.id_categoria);
    const coincideStock = !filtros.estado_stock
      || producto.estado_stock === filtros.estado_stock;
    const coincideVencimiento = !filtros.estado_vencimiento
      || producto.estado_vencimiento === filtros.estado_vencimiento;
    const coincideActivo = filtros.activo === ''
      || String(producto.activo) === String(filtros.activo);

    return coincideBusqueda
      && coincideCategoria
      && coincideStock
      && coincideVencimiento
      && coincideActivo;
  });
};

export const siguienteCodigoProducto = (productos) => {
  const numeros = (productos || [])
    .map((producto) => /^MED(\d+)/.exec(producto.codigo || ''))
    .filter(Boolean)
    .map((coincidencia) => Number(coincidencia[1]));

  const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `MED${String(siguiente).padStart(3, '0')}`;
};
