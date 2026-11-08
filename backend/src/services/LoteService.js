const LoteDAO = require('../daos/LoteDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');
const MovimientoInventarioDAO = require('../daos/MovimientoInventarioDAO');
const BitacoraInventarioDAO = require('../daos/BitacoraInventarioDAO');
const AppError = require('../errors/AppError');
const { validarAccesoSucursal } = require('../utils/accesoSucursal');

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

  await MovimientoInventarioDAO.registrar({
    id_lote: lote.id_lote,
    tipo: 'entrada',
    cantidad_anterior: 0,
    cantidad_nueva: Number(lote.stock_actual),
    id_usuario: Number(id_usuario),
    id_sucursal: Number(lote.id_sucursal),
    motivo: 'Ingreso inicial del lote',
    referencia: `lote:${lote.id_lote}`,
  }, client);

  await BitacoraInventarioDAO.registrar({
    entidad: 'lote',
    id_entidad: lote.id_lote,
    accion: 'alta',
    id_producto: lote.id_producto,
    id_lote: lote.id_lote,
    id_sucursal: lote.id_sucursal,
    id_usuario: Number(id_usuario),
    nuevo: await LoteDAO.obtenerPorId(lote.id_lote, client),
  }, client);

  return await LoteDAO.obtenerPorId(lote.id_lote, client);
};

const crearLote = async (datos, id_usuario) => (
  LoteDAO.ejecutarEnTransaccion(
    (client) => crearLoteEnTransaccion(datos, id_usuario, client),
  )
);

const obtenerPorSucursal = async (id_sucursal, usuario) => {
  validarAccesoSucursal(
    usuario,
    id_sucursal,
    'No tienes permiso para consultar lotes de otra sucursal',
  );
  return await LoteDAO.obtenerPorSucursal(id_sucursal);
};

const obtenerPorProducto = async (id_producto, usuario, filtros = {}) => {
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);
  const idSucursal = usuario?.rol === 'dependiente'
    ? Number(usuario.id_sucursal)
    : filtros.id_sucursal ?? null;
  if (filtros.id_sucursal) {
    validarAccesoSucursal(usuario, filtros.id_sucursal, 'No tienes permiso para consultar lotes de otra sucursal');
  }
  if (filtros.pagina !== undefined || filtros.limite !== undefined) {
    return LoteDAO.obtenerPorProducto(id_producto, idSucursal, {
      pagina: filtros.pagina ?? 1, limite: filtros.limite ?? 25,
      estado_stock: filtros.estado_stock, estado_vencimiento: filtros.estado_vencimiento,
    });
  }
  return LoteDAO.obtenerPorProducto(id_producto, idSucursal);
};

const obtenerPorId = async (id_lote, usuario) => {
  const lote = await LoteDAO.obtenerPorId(id_lote);
  if (!lote) lanzarError('Lote no encontrado', 404);
  validarAccesoSucursal(
    usuario,
    lote.id_sucursal,
    'No tienes permiso para consultar lotes de otra sucursal',
  );
  return lote;
};

/**
 * Actualiza únicamente los metadatos enviados y comprueba su versión.
 * Las existencias se modifican exclusivamente mediante ajustarStock.
 */
const actualizarLoteEnTransaccion = async (id_lote, campos, id_usuario, client) => {
  const lote = await LoteDAO.obtenerFilaPorId(id_lote, client, true);
  if (!lote) lanzarError('Lote no encontrado', 404);

  if (
    Object.prototype.hasOwnProperty.call(campos, 'stock_actual')
    || Object.prototype.hasOwnProperty.call(campos, 'cantidad_ingresada')
  ) {
    lanzarError(
      'Las existencias no se modifican al editar el lote. Utiliza el ajuste de stock',
      400,
    );
  }

  const camposPermitidos = [
    'id_producto', 'id_proveedor', 'id_sucursal', 'numero_lote',
    'fecha_vencimiento', 'precio_compra', 'precio_venta',
    'margen_ganancia', 'precio_mayoreo', 'cantidad_mayoreo',
    'limpiar_mayoreo', 'version',
  ];
  const datos = Object.fromEntries(
    Object.entries(campos).filter(([campo]) => camposPermitidos.includes(campo)),
  );
  const tieneCambio = Object.keys(datos).some((campo) => !['limpiar_mayoreo', 'version'].includes(campo))
    || datos.limpiar_mayoreo === true;
  if (!tieneCambio)
    lanzarError('Debe proporcionar al menos un campo válido para actualizar', 400);

  const cambiaAsignacion = [
    'id_producto',
    'id_proveedor',
    'id_sucursal',
  ].some((campo) => (
    datos[campo] !== undefined
    && Number(datos[campo]) !== Number(lote[campo])
  ));
  if (cambiaAsignacion && await LoteDAO.fueUtilizado(id_lote, client)) {
    lanzarError(
      'No se puede reasignar un lote que ya fue utilizado en una venta',
      409,
    );
  }

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
  if (!actualizado && datos.version !== undefined) {
    lanzarError(
      'El lote fue actualizado por otra persona. Recarga la información antes de guardar',
      409,
    );
  }
  if (!actualizado) lanzarError('No se pudo actualizar el lote', 500);

  const loteActualizado = await LoteDAO.obtenerPorId(id_lote, client);
  if (id_usuario) {
    await BitacoraInventarioDAO.registrar({
      entidad: 'lote',
      id_entidad: id_lote,
      accion: 'modificacion',
      id_producto: loteActualizado.id_producto,
      id_lote,
      id_sucursal: loteActualizado.id_sucursal,
      id_usuario: Number(id_usuario),
      anterior: lote,
      nuevo: loteActualizado,
    }, client);
  }
  return loteActualizado;
};

const actualizarLote = async (id_lote, campos, id_usuario = null) => (
  LoteDAO.ejecutarEnTransaccion(
    (client) => actualizarLoteEnTransaccion(id_lote, campos, id_usuario, client),
  )
);

const ajustarStock = async (id_lote, datos, usuario) => (
  LoteDAO.ejecutarEnTransaccion(async (client) => {
    const lote = await LoteDAO.obtenerFilaPorId(id_lote, client, true);
    if (!lote) lanzarError('Lote no encontrado', 404);

    const actualizado = await LoteDAO.ajustarStock(id_lote, datos, client);
    if (!actualizado) {
      lanzarError(
        'El stock cambió desde que abriste el lote o el ajuste dejaría existencias negativas. Recarga e intenta de nuevo',
        409,
      );
    }

    await MovimientoInventarioDAO.registrar({
      id_lote,
      tipo: 'ajuste',
      cantidad_anterior: Number(lote.stock_actual),
      cantidad_nueva: Number(actualizado.stock_actual),
      id_usuario: Number(usuario.id_usuario),
      id_sucursal: Number(lote.id_sucursal),
      motivo: datos.motivo.trim(),
      referencia: `ajuste:lote:${id_lote}`,
    }, client);

    return LoteDAO.obtenerPorId(id_lote, client);
  })
);

const obtenerMovimientos = async (id_lote, usuario) => {
  const lote = await LoteDAO.obtenerPorId(id_lote);
  if (!lote) lanzarError('Lote no encontrado', 404);
  validarAccesoSucursal(
    usuario,
    lote.id_sucursal,
    'No tienes permiso para consultar movimientos de otra sucursal',
  );
  return MovimientoInventarioDAO.obtenerPorLote(id_lote);
};

const eliminarLote = async (id_lote, id_usuario = null) => {
  try {
    return await LoteDAO.ejecutarEnTransaccion(async (client) => {
      const existente = await LoteDAO.obtenerPorId(id_lote, client);
      if (!existente) lanzarError('Lote no encontrado', 404);

      const eliminado = await LoteDAO.eliminar(id_lote, client);
      if (!eliminado) lanzarError('No se pudo eliminar el lote', 500);
      if (id_usuario) {
        await BitacoraInventarioDAO.registrar({
          entidad: 'lote',
          id_entidad: id_lote,
          accion: 'eliminacion',
          id_producto: existente.id_producto,
          id_lote,
          id_sucursal: existente.id_sucursal,
          id_usuario: Number(id_usuario),
          anterior: existente,
          nuevo: null,
        }, client);
      }
      return { mensaje: 'Lote eliminado correctamente' };
    });
  } catch (error) {
    if (error.code === '23503') {
      lanzarError('No se puede eliminar un lote asociado a ventas, movimientos o a un historial de precios', 409);
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
  ajustarStock,
  obtenerMovimientos,
  eliminarLote,
  obtenerAlertas,
};
