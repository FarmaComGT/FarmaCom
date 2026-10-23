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

const fechaFEFO = (lote) => {
  if (!lote.fecha_vencimiento) return Number.POSITIVE_INFINITY;
  const fecha = new Date(lote.fecha_vencimiento).getTime();
  return Number.isFinite(fecha) ? fecha : Number.POSITIVE_INFINITY;
};

export const ordenarLotesFEFO = (lotes = []) => [...lotes].sort((primero, segundo) => (
  fechaFEFO(primero) - fechaFEFO(segundo)
  || Number(primero.id_lote) - Number(segundo.id_lote)
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
    const todosLosLotes = ordenarLotesFEFO([...lotesPorId.values()]);
    const lotesConPrecio = todosLosLotes.filter((lote) => lote.tiene_precio);
    const lotesDisponibles = lotesConPrecio.length > 0 ? lotesConPrecio : todosLosLotes;
    const loteFEFO = lotesDisponibles[0];

    return {
      ...datos,
      id_producto: Number(datos.id_producto),
      id_lote: loteFEFO?.id_lote ?? null,
      carritoKey: `producto-${datos.id_producto}`,
      lotes: lotesDisponibles,
      cantidad_lotes: lotesDisponibles.length,
      numero_lote: loteFEFO?.numero_lote,
      fecha_vencimiento: loteFEFO?.fecha_vencimiento ?? null,
      estado_vencimiento: loteFEFO?.estado_vencimiento,
      estado_stock: loteFEFO?.estado_stock,
      stock_disponible: lotesDisponibles.reduce(
        (total, lote) => total + lote.stock_disponible,
        0,
      ),
      precio_venta: loteFEFO?.precio_venta ?? null,
      tiene_precio: lotesConPrecio.length > 0,
    };
  });
};

export const asignarLotesFEFO = (producto, cantidad) => {
  const cantidadSolicitada = Number(cantidad);
  if (!Number.isInteger(cantidadSolicitada) || cantidadSolicitada <= 0) {
    throw new Error('El carrito contiene una cantidad inválida.');
  }

  const lotes = producto.lotes?.length
    ? ordenarLotesFEFO(producto.lotes)
    : ordenarLotesFEFO([{
      id_lote: producto.id_lote,
      fecha_vencimiento: producto.fecha_vencimiento,
      stock_disponible: producto.stock_disponible,
    }]);
  const detalles = [];
  let pendiente = cantidadSolicitada;

  for (const lote of lotes) {
    const stockDisponible = Math.max(0, numeroSeguro(lote.stock_disponible));
    const cantidadLote = Math.min(pendiente, stockDisponible);
    if (!lote.id_lote || cantidadLote <= 0) continue;

    detalles.push({ id_lote: Number(lote.id_lote), cantidad: cantidadLote });
    pendiente -= cantidadLote;
    if (pendiente === 0) break;
  }

  if (pendiente > 0) {
    throw new Error(`Stock insuficiente para ${producto.nombre_comercial || 'el producto'}.`);
  }

  return detalles;
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
