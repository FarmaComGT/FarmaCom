const LoteDAO = require('../daos/LoteDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');
const AppError = require('../errors/AppError');

//  Helpers 

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const validarFechaVencimiento = (fechaVencimiento) => {
  if (fechaVencimiento === null || fechaVencimiento === undefined) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaVencimiento);

  if (isNaN(fecha.getTime()))
    lanzarError('fecha_vencimiento no es una fecha válida', 400);
  if (fecha <= hoy)
    lanzarError('La fecha de vencimiento debe ser posterior a hoy', 400);

  return fechaVencimiento;
};

const validarProveedorActivo = async (id_proveedor, client) => {
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor, client);
  if (!proveedor) lanzarError('Proveedor no encontrado', 404);
  if (!proveedor.activo) lanzarError('No se puede asignar un proveedor inactivo', 409);
};

//  Lote 

const crearLoteEnTransaccion = async (datos, id_usuario, client) => {
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

  if (!Number.isInteger(Number(id_usuario)) || Number(id_usuario) <= 0) {
    lanzarError('Se requiere un usuario válido para registrar los precios', 400);
  }

  // Verificar que el producto exista y esté activo
  const producto = await ProductoDAO.obtenerPorId(id_producto, client);
  if (!producto)        lanzarError('Producto no encontrado', 404);
  if (!producto.activo) lanzarError('No se puede agregar un lote a un producto inactivo', 409);
  await validarProveedorActivo(id_proveedor, client);

  const precioCompraNumerico = Number(precio_compra);
  if (
    precio_compra === undefined
    || precio_compra === null
    || (typeof precio_compra === 'string' && precio_compra.trim() === '')
    || !Number.isFinite(precioCompraNumerico)
    || precioCompraNumerico < 0
  ) {
    lanzarError('El precio de compra es requerido y no puede ser negativo', 400);
  }

  const fechaVencimientoNormalizada = validarFechaVencimiento(fecha_vencimiento);

  // Verificar cantidad
  if (!Number.isInteger(Number(cantidad_ingresada)) || Number(cantidad_ingresada) <= 0)
    lanzarError('La cantidad ingresada debe ser un entero mayor a 0', 400);

  await LoteDAO.bloquearHistorialProductoSucursal(id_producto, id_sucursal, client);

  // Número de lote único por producto y sucursal
  const duplicado = await LoteDAO.obtenerPorNumeroLote(
    numero_lote,
    id_producto,
    id_sucursal,
    null,
    client,
  );
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

  const loteAnterior = await LoteDAO.obtenerUltimoPorProductoSucursal(
    id_producto,
    id_sucursal,
    client,
  );
  const lote = await LoteDAO.crear({
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento: fechaVencimientoNormalizada,
    cantidad_ingresada,
    precio_compra: precioCompraNumerico,
    precio_venta,
    margen_ganancia,
    precio_mayoreo:   precio_mayoreo   ?? null,
    cantidad_mayoreo: cantidad_mayoreo ?? null,
  }, client);

  await HistorialPrecioLoteDAO.registrarPorIngreso(
    loteAnterior,
    lote,
    Number(id_usuario),
    client,
  );

  return await LoteDAO.obtenerPorId(lote.id_lote, client);
};

const crearLote = async (datos, id_usuario) => (
  LoteDAO.ejecutarEnTransaccion(
    (client) => crearLoteEnTransaccion(datos, id_usuario, client),
  )
);

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
const actualizarLoteEnTransaccion = async (id_lote, campos, client) => {
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


  if (
    datos.id_proveedor !== undefined
    && Number(datos.id_proveedor) !== Number(lote.id_proveedor)
  ) {
    await validarProveedorActivo(datos.id_proveedor, client);
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
    datos.fecha_vencimiento = validarFechaVencimiento(datos.fecha_vencimiento);
  }

  const cantidadIngresada = datos.cantidad_ingresada ?? Number(lote.cantidad_ingresada);
  const stockActual = datos.stock_actual ?? Number(lote.stock_actual);
  if (stockActual < 0)
    lanzarError('El stock actual no puede ser negativo', 400);
  if (stockActual > cantidadIngresada)
    lanzarError('El stock actual no puede superar la cantidad ingresada del lote', 400);

  if (
    datos.precio_compra !== undefined
    && (
      datos.precio_compra === null
      || (typeof datos.precio_compra === 'string' && datos.precio_compra.trim() === '')
      || !Number.isFinite(Number(datos.precio_compra))
      || Number(datos.precio_compra) < 0
    )
  ) {
    lanzarError('El precio de compra no puede ser negativo', 400);
  }

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

  return await LoteDAO.obtenerPorId(id_lote, client);
};

const actualizarLote = async (id_lote, campos) => (
  LoteDAO.ejecutarEnTransaccion(
    (client) => actualizarLoteEnTransaccion(id_lote, campos, client),
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
