const LoteDAO = require('../daos/LoteDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');

//  Helpers 

const lanzarError = (mensaje, status) => {
  const err = new Error(mensaje);
  err.status = status;
  throw err;
};

//  Lote 

const crearLote = async (datos) => {
  const {
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento,
    cantidad_ingresada,
    precio_compra,
    precio_venta,
    margen_ganancia,
    precio_mayoreo,
    cantidad_mayoreo,
  } = datos;

  // Verificar que el producto exista y esté activo
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto)        lanzarError('Producto no encontrado', 404);
  if (!producto.activo) lanzarError('No se puede agregar un lote a un producto inactivo', 409);

  const precioCompraEfectivo = precio_compra ?? Number(producto.precio_compra);
  if (!Number.isFinite(Number(precioCompraEfectivo)) || Number(precioCompraEfectivo) < 0)
    lanzarError('El precio de compra no puede ser negativo', 400);

  // Verificar fecha de vencimiento, no puede ser pasada
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaVenc = new Date(fecha_vencimiento);
  if (isNaN(fechaVenc.getTime()))
    lanzarError('fecha_vencimiento no es una fecha válida', 400);
  if (fechaVenc <= hoy)
    lanzarError('La fecha de vencimiento debe ser posterior a hoy', 400);

  // Verificar cantidad
  if (!Number.isInteger(Number(cantidad_ingresada)) || Number(cantidad_ingresada) <= 0)
    lanzarError('La cantidad ingresada debe ser un entero mayor a 0', 400);

  // Número de lote único por producto y sucursal
  const duplicado = await LoteDAO.obtenerPorNumeroLote(numero_lote, id_producto, id_sucursal);
  if (duplicado)
    lanzarError(
      `Ya existe un lote con el número "${numero_lote}" para este producto en esta sucursal`,
      409,
    );

  // Precio de venta del lote
  if (precio_venta === undefined || precio_venta < 0)
    lanzarError('El precio de venta es requerido y no puede ser negativo', 400);
  if (margen_ganancia === undefined || margen_ganancia < 0 || margen_ganancia > 9999.9999)
    lanzarError('El margen de ganancia debe estar entre 0 y 9999.9999', 400);

  // precio_mayoreo y cantidad_mayoreo se definen juntos o ninguno
  const tienePrecioMayoreo   = precio_mayoreo   != null;
  const tieneCantidadMayoreo = cantidad_mayoreo != null;
  if (tienePrecioMayoreo !== tieneCantidadMayoreo)
    lanzarError('precio_mayoreo y cantidad_mayoreo deben definirse juntos', 400);

  const lote = await LoteDAO.crear({
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento,
    cantidad_ingresada,
    precio_compra: Number(precioCompraEfectivo),
    precio_venta,
    margen_ganancia,
    precio_mayoreo:   precio_mayoreo   ?? null,
    cantidad_mayoreo: cantidad_mayoreo ?? null,
  });

  return await LoteDAO.obtenerPorId(lote.id_lote);
};

const obtenerPorSucursal = async (id_sucursal) => {
  return await LoteDAO.obtenerPorSucursal(id_sucursal);
};

const obtenerPorProducto = async (id_producto) => {
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);
  return await LoteDAO.obtenerPorProducto(id_producto);
};

const obtenerPorId = async (id_lote) => {
  const lote = await LoteDAO.obtenerPorId(id_lote);
  if (!lote) lanzarError('Lote no encontrado', 404);
  return lote;
};

/**
 * Permite actualizar los datos propios del lote.
 * El stock no puede quedar negativo ni superar la cantidad ingresada.
 */
const actualizarLoteEnTransaccion = async (id_lote, campos, id_usuario, client) => {
  const lote = await LoteDAO.obtenerFilaPorId(id_lote, client, true);
  if (!lote) lanzarError('Lote no encontrado', 404);

  const camposPermitidos = [
    'id_producto', 'id_proveedor', 'id_sucursal', 'numero_lote',
    'fecha_vencimiento', 'cantidad_ingresada', 'stock_actual',
    'precio_compra', 'precio_venta', 'margen_ganancia', 'precio_mayoreo',
    'cantidad_mayoreo', 'limpiar_mayoreo',
  ];
  const datos = Object.fromEntries(
    Object.entries(campos).filter(([campo]) => camposPermitidos.includes(campo)),
  );
  const tieneCambio = Object.keys(datos).some((campo) => campo !== 'limpiar_mayoreo')
    || datos.limpiar_mayoreo === true;
  if (!tieneCambio)
    lanzarError('Debe proporcionar al menos un campo válido para actualizar', 400);

  if (datos.id_producto !== undefined && datos.id_producto !== lote.id_producto) {
    const producto = await ProductoDAO.obtenerPorId(datos.id_producto, client);
    if (!producto) lanzarError('Producto no encontrado', 404);
    if (!producto.activo) lanzarError('No se puede asignar el lote a un producto inactivo', 409);
  }

  const numeroLote = datos.numero_lote ?? lote.numero_lote;
  const idProducto = datos.id_producto ?? lote.id_producto;
  const idSucursal = datos.id_sucursal ?? lote.id_sucursal;
  if (
    numeroLote !== lote.numero_lote
    || idProducto !== lote.id_producto
    || idSucursal !== lote.id_sucursal
  ) {
    const duplicado = await LoteDAO.obtenerPorNumeroLote(
      numeroLote,
      idProducto,
      idSucursal,
      id_lote,
      client,
    );
    if (duplicado) {
      lanzarError(
        `Ya existe un lote con el número "${numeroLote}" para este producto en esta sucursal`,
        409,
      );
    }
  }

  if (datos.fecha_vencimiento !== undefined) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaVenc = new Date(datos.fecha_vencimiento);
    if (isNaN(fechaVenc.getTime()))
      lanzarError('fecha_vencimiento no es una fecha válida', 400);
    if (fechaVenc <= hoy)
      lanzarError('La fecha de vencimiento debe ser posterior a hoy', 400);
  }

  const cantidadIngresada = datos.cantidad_ingresada ?? Number(lote.cantidad_ingresada);
  const stockActual = datos.stock_actual ?? Number(lote.stock_actual);
  if (stockActual < 0)
    lanzarError('El stock actual no puede ser negativo', 400);
  if (stockActual > cantidadIngresada)
    lanzarError('El stock actual no puede superar la cantidad ingresada del lote', 400);

  if (datos.precio_compra !== undefined && datos.precio_compra < 0)
    lanzarError('El precio de compra no puede ser negativo', 400);

  if (datos.precio_venta !== undefined && datos.precio_venta < 0)
    lanzarError('El precio de venta no puede ser negativo', 400);

  if (
    datos.margen_ganancia !== undefined
    && (datos.margen_ganancia < 0 || datos.margen_ganancia > 9999.9999)
  )
    lanzarError('El margen de ganancia debe estar entre 0 y 9999.9999', 400);

  // Limpiar mayoreo explícitamente
  if (datos.limpiar_mayoreo === true) {
    delete datos.precio_mayoreo;
    delete datos.cantidad_mayoreo;
  } else {
    const tienePrecioMayoreo   = datos.precio_mayoreo   != null;
    const tieneCantidadMayoreo = datos.cantidad_mayoreo != null;
    if (tienePrecioMayoreo !== tieneCantidadMayoreo)
      lanzarError('precio_mayoreo y cantidad_mayoreo deben definirse juntos', 400);
  }

  let actualizado;
  try {
    actualizado = await LoteDAO.actualizar(id_lote, datos, client);
  } catch (error) {
    if (error.code === '23505') {
      lanzarError('Ya existe un lote con ese número para este producto en esta sucursal', 409);
    }
    if (error.code === '23503') {
      lanzarError('El producto, proveedor o sucursal indicado no existe', 400);
    }
    throw error;
  }
  if (!actualizado) lanzarError('No se pudo actualizar el lote', 500);

  const cambioPrecio = (
    Number(lote.precio_compra) !== Number(actualizado.precio_compra)
    || Number(lote.precio_venta) !== Number(actualizado.precio_venta)
  );
  if (cambioPrecio) {
    if (!Number.isInteger(Number(id_usuario)) || Number(id_usuario) <= 0) {
      lanzarError('Se requiere un usuario valido para cambiar precios', 400);
    }
    await HistorialPrecioLoteDAO.registrarCambios(
      id_lote,
      Number(id_usuario),
      lote,
      actualizado,
      client,
    );
  }

  return await LoteDAO.obtenerPorId(id_lote, client);
};

const actualizarLote = async (id_lote, campos, id_usuario) => (
  LoteDAO.ejecutarEnTransaccion(
    (client) => actualizarLoteEnTransaccion(id_lote, campos, id_usuario, client),
  )
);

const eliminarLote = async (id_lote) => {
  const existente = await LoteDAO.obtenerPorId(id_lote);
  if (!existente) lanzarError('Lote no encontrado', 404);

  try {
    const eliminado = await LoteDAO.eliminar(id_lote);
    if (!eliminado) lanzarError('No se pudo eliminar el lote', 500);
    return { mensaje: 'Lote eliminado correctamente' };
  } catch (error) {
    if (error.code === '23503') {
      lanzarError('No se puede eliminar un lote asociado a ventas o a un historial de precios', 409);
    }
    throw error;
  }
};

//  Alertas

const obtenerAlertas = async (id_sucursal = null) => {
  return await LoteDAO.obtenerAlertas(id_sucursal);
};

module.exports = {
  crearLote,
  obtenerPorSucursal,
  obtenerPorProducto,
  obtenerPorId,
  actualizarLote,
  eliminarLote,
  obtenerAlertas,
};
