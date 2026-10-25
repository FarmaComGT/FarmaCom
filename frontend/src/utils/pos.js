export const formatearQuetzales = (valor) =>
  new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(Number(valor) || 0);

const numeroSeguro = (valor, predeterminado = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : predeterminado;
};

const normalizarLotePOS = (lote) => {
  const stockDisponible = Math.max(
    0,
    numeroSeguro(lote.stock_disponible ?? lote.stock_actual),
  );
  const precioVenta = Number(lote.precio_venta);
  const tienePrecio = lote.precio_venta !== null
    && lote.precio_venta !== undefined
    && lote.precio_venta !== ''
    && Number.isFinite(precioVenta)
    && precioVenta > 0;

  return {
    id_lote: Number(lote.id_lote),
    numero_lote: lote.numero_lote,
    fecha_vencimiento: lote.fecha_vencimiento ?? null,
    estado_vencimiento: lote.estado_vencimiento,
    estado_stock: lote.estado_stock,
    stock_disponible: stockDisponible,
    precio_venta: tienePrecio ? precioVenta : null,
    tiene_precio: tienePrecio,
    precio_mayoreo: lote.precio_mayoreo,
    cantidad_mayoreo: lote.cantidad_mayoreo,
  };
};

const ordenarLotesPorNumero = (lotes = []) => [...lotes].sort((primero, segundo) => (
  String(primero.numero_lote || '').localeCompare(
    String(segundo.numero_lote || ''),
    'es',
    { numeric: true },
  ) || Number(primero.id_lote) - Number(segundo.id_lote)
));

export const agruparLotesPorProductoPOS = (filas = []) => {
  const productos = new Map();

  filas.forEach((fila) => {
    const idProducto = Number(fila.id_producto);
    const idLote = Number(fila.id_lote);
    if (!idProducto || !idLote || fila.estado_vencimiento === 'vencido') return;

    const lote = normalizarLotePOS(fila);
    if (lote.stock_disponible <= 0) return;

    if (!productos.has(idProducto)) {
      productos.set(idProducto, {
        datos: { ...fila, id_producto: idProducto },
        lotes: new Map(),
      });
    }
    productos.get(idProducto).lotes.set(idLote, lote);
  });

  return [...productos.values()].map(({ datos, lotes: lotesPorId }) => {
    const lotesDisponibles = ordenarLotesPorNumero([...lotesPorId.values()]);
    const precios = lotesDisponibles
      .filter((lote) => lote.tiene_precio)
      .map((lote) => lote.precio_venta);
    const {
      id_lote: _idLote,
      numero_lote: _numeroLote,
      fecha_vencimiento: _fechaVencimiento,
      estado_vencimiento: _estadoVencimiento,
      estado_stock: _estadoStock,
      precio_venta: _precioVenta,
      stock_disponible: _stockDisponible,
      ...datosProducto
    } = datos;

    return {
      ...datosProducto,
      id_producto: Number(datos.id_producto),
      lotes: lotesDisponibles,
      cantidad_lotes: lotesDisponibles.length,
      stock_disponible: lotesDisponibles.reduce(
        (total, lote) => total + lote.stock_disponible,
        0,
      ),
      precio_minimo: precios.length ? Math.min(...precios) : null,
      precio_maximo: precios.length ? Math.max(...precios) : null,
      tiene_precio: precios.length > 0,
    };
  });
};

export const crearItemLotePOS = (producto, lote) => {
  const {
    lotes: _lotes,
    cantidad_lotes: _cantidadLotes,
    precio_minimo: _precioMinimo,
    precio_maximo: _precioMaximo,
    stock_disponible: _stockProducto,
    ...datosProducto
  } = producto;

  return {
    ...datosProducto,
    ...lote,
    id_producto: Number(producto.id_producto),
    id_lote: Number(lote.id_lote),
    carritoKey: `lote-${lote.id_lote}`,
    tiene_precio: Boolean(lote.tiene_precio),
  };
};

export const construirCatalogoPOS = (inventario = [], lotes = []) => {
  const productosPorId = new Map(
    inventario.map((producto) => [Number(producto.id_producto), producto]),
  );
  const filasVendibles = [];

  for (const lote of lotes) {
    const producto = productosPorId.get(Number(lote.id_producto));
    const productoActivo = producto?.activo !== false;

    if (!producto || !productoActivo) continue;

    filasVendibles.push({
      ...lote,
      codigo: producto.codigo,
      nombre_comercial: lote.nombre_comercial || producto.nombre_comercial,
      nombre_generico: lote.nombre_generico || producto.nombre_generico,
      concentracion: lote.concentracion || producto.concentracion,
      presentacion: lote.presentacion || producto.presentacion,
    });
  }

  return agruparLotesPorProductoPOS(filasVendibles).sort((a, b) =>
    a.nombre_comercial.localeCompare(b.nombre_comercial, 'es'));
};

export const filtrarCatalogoPOS = (productos, busqueda) => {
  const termino = busqueda.trim().toLocaleLowerCase('es');
  if (!termino) return productos;

  return productos.filter((producto) => [
    producto.nombre_comercial,
    producto.nombre_generico,
    producto.concentracion,
    producto.codigo,
    producto.presentacion,
  ].some((valor) => String(valor || '').toLocaleLowerCase('es').includes(termino)));
};
