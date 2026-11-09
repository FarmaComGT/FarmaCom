const PromocionDAO    = require('../daos/PromocionDAO');
const ProductoDAO     = require('../daos/ProductoDAO');
const AppError        = require('../errors/AppError');
const { completarPaginacion } = require('../validators/paginacionValidators');
const { validarAccesoSucursal } = require('../utils/accesoSucursal');

// Helpers

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const validarFechas = (fecha_inicio, fecha_fin) => {
  const inicio = new Date(fecha_inicio);
  const fin    = new Date(fecha_fin);
  if (isNaN(inicio.getTime())) lanzarError('fecha_inicio no es una fecha válida', 400);
  if (fecha_fin == null) return;
  if (isNaN(fin.getTime()))    lanzarError('fecha_fin no es una fecha válida', 400);
  if (fin <= inicio)           lanzarError('fecha_fin debe ser posterior a fecha_inicio', 400);
};

const validarCupo = (maxima, minima, asignada = 0) => {
  if (maxima == null) return;
  if (!Number.isInteger(maxima) || maxima < 1 || maxima > 2147483647) lanzarError('La cantidad máxima debe ser un entero positivo', 400);
  if (maxima < Number(minima)) lanzarError('La cantidad máxima no puede ser menor que la cantidad mínima por venta', 400);
  if (maxima < asignada) lanzarError('La cantidad máxima no puede ser menor que las unidades vendidas y reservadas', 409);
};

const lanzarConflicto = (promocion) => {
  throw new AppError('Ya existe una promoción activa para este producto y sucursal en ese rango de fechas', 409,
    [{ campo: 'fecha_inicio', id_promocion: promocion.id_promocion, nombre: promocion.nombre || (promocion.cantidad_minima != null ? `Desde ${new Intl.NumberFormat('es-GT').format(promocion.cantidad_minima)} unidades` : 'Promoción activa') }]);
};

const filtrarSucursal = (filtros, usuario) => {
  if (usuario && filtros.id_sucursal) validarAccesoSucursal(usuario, filtros.id_sucursal);
  return usuario?.rol === 'dependiente'
    ? { ...filtros, id_sucursal: usuario.id_sucursal } : filtros;
};

const obtenerTodas = (filtros, usuario) => PromocionDAO.obtenerTodas(filtrarSucursal(filtros, usuario));
const obtenerReferencia = (idProducto, idSucursal, usuario) => {
  validarAccesoSucursal(usuario, idSucursal);
  return PromocionDAO.obtenerPrecioVentaMinimoDisponible(idProducto, idSucursal);
};

const validarPrecioPromocional = async (id_producto, id_sucursal, precio_promocion) => {
  const precioMinimo = await PromocionDAO.obtenerPrecioVentaMinimoDisponible(
    id_producto,
    id_sucursal,
  );
  if (precioMinimo === null) {
    lanzarError(
      'No hay lotes vendibles con precio para validar la promoción en esta sucursal',
      409,
    );
  }

  const precioPromocionalCentavos = Math.round(Number(precio_promocion) * 100);
  const precioMinimoCentavos = Math.round(Number(precioMinimo) * 100);

  if (precioPromocionalCentavos >= precioMinimoCentavos) {
    lanzarError(
      `El precio de promoción debe ser menor que el precio normal mínimo de Q${Number(precioMinimo).toFixed(2)}`,
      400,
    );
  }

  return Number(precioMinimo);
};

// Operaciones

const crearPromocion = async (id_producto, datos) => {
  const { id_sucursal, cantidad_minima, precio_promocion, fecha_inicio, fecha_fin = null, nombre, cantidad_maxima = null } = datos;
  validarCupo(cantidad_maxima, cantidad_minima);

  // Verificar que el producto exista
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);
  if (producto.activo === false) lanzarError('No se puede crear una promoción para un producto inactivo', 409);

  if (cantidad_minima <= 0)  lanzarError('La cantidad mínima debe ser mayor a 0', 400);
  if (precio_promocion <= 0) lanzarError('El precio de promoción debe ser mayor a 0', 400);

  validarFechas(fecha_inicio, fecha_fin);
  await validarPrecioPromocional(id_producto, id_sucursal, precio_promocion);

  // Validar que no exista una promoción activa solapada para el mismo
  // producto y sucursal
  const solapada = await PromocionDAO.existeActivaSolapada({
    id_producto,
    id_sucursal,
    fecha_inicio,
    fecha_fin,
  });
  if (solapada) {
    lanzarConflicto(solapada);
  }

  return await PromocionDAO.crear({ id_producto, id_sucursal, cantidad_minima, precio_promocion, fecha_inicio, fecha_fin, cantidad_maxima, nombre: nombre?.trim() || null });
};

const obtenerPorProducto = async (id_producto, filtros = {}, usuario) => {
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);
  return await PromocionDAO.obtenerPorProducto(id_producto, completarPaginacion(filtrarSucursal(filtros, usuario)));
};

const obtenerPorId = async (id_promocion, usuario) => {
  const promocion = await PromocionDAO.obtenerPorId(id_promocion);
  if (!promocion) lanzarError('Promoción no encontrada', 404);
  if (usuario) validarAccesoSucursal(usuario, promocion.id_sucursal);
  return promocion;
};

const actualizarPromocion = async (id_promocion, campos) => {
  campos = Object.fromEntries(Object.entries(campos).filter(([campo]) => ['nombre', 'cantidad_minima', 'precio_promocion', 'fecha_inicio', 'fecha_fin', 'cantidad_maxima'].includes(campo)));
  if (!Object.keys(campos).length) lanzarError('No hay cambios válidos para guardar', 400);
  if ('nombre' in campos) campos.nombre = campos.nombre?.trim() || null;
  const existente = await PromocionDAO.obtenerPorId(id_promocion);
  if (!existente) lanzarError('Promoción no encontrada', 404);
  validarCupo(Object.hasOwn(campos, 'cantidad_maxima') ? campos.cantidad_maxima : existente.cantidad_maxima,
    campos.cantidad_minima ?? existente.cantidad_minima, Number(existente.cantidad_vendida || 0) + Number(existente.cantidad_reservada || 0));

  if (campos.cantidad_minima !== undefined && campos.cantidad_minima <= 0) {
    lanzarError('La cantidad mínima debe ser mayor a 0', 400);
  }

  if (campos.precio_promocion !== undefined && campos.precio_promocion <= 0) {
    lanzarError('El precio de promoción debe ser mayor a 0', 400);
  }

  // Si se actualizan fechas, validar coherencia y solapamiento
  const fecha_inicio = campos.fecha_inicio ?? existente.fecha_inicio;
  const fecha_fin    = Object.hasOwn(campos, 'fecha_fin') ? campos.fecha_fin : existente.fecha_fin;
  const precio_promocion = campos.precio_promocion ?? existente.precio_promocion;

  await validarPrecioPromocional(
    existente.id_producto,
    existente.id_sucursal,
    precio_promocion,
  );

  if (Object.hasOwn(campos, 'fecha_inicio') || Object.hasOwn(campos, 'fecha_fin')) {
    validarFechas(fecha_inicio, fecha_fin);

    const solapada = await PromocionDAO.existeActivaSolapada({
      id_producto:     existente.id_producto,
      id_sucursal:     existente.id_sucursal,
      fecha_inicio,
      fecha_fin,
      excluir_id:      id_promocion,
    });
    if (solapada && existente.activo !== false) lanzarConflicto(solapada);
  }

  const actualizado = await PromocionDAO.actualizar(id_promocion, campos);
  if (!actualizado) lanzarError('El cupo cambió durante la edición. Recarga la promoción y revisa la cantidad máxima', 409);
  return actualizado;
};

const cambiarEstadoPromocion = async (id_promocion, activo) => {
  const existente = await PromocionDAO.obtenerPorId(id_promocion);
  if (!existente) lanzarError('Promoción no encontrada', 404);
  if (existente.activo === activo) {
    lanzarError(`La promoción ya está ${activo ? 'activa' : 'desactivada'}`, 409);
  }

  if (activo) {
    await validarPrecioPromocional(
      existente.id_producto,
      existente.id_sucursal,
      existente.precio_promocion,
    );

    const solapada = await PromocionDAO.existeActivaSolapada({
      id_producto: existente.id_producto,
      id_sucursal: existente.id_sucursal,
      fecha_inicio: existente.fecha_inicio,
      fecha_fin: existente.fecha_fin,
      excluir_id: id_promocion,
    });
    if (solapada) lanzarConflicto(solapada);
  }

  const resultado = await PromocionDAO.cambiarActivo(id_promocion, activo);
  return {
    mensaje: `Promoción ${activo ? 'activada' : 'desactivada'} correctamente`,
    promocion: resultado,
  };
};

// Borrado físico
const eliminarPromocion = async (id_promocion) => {
  const existente = await PromocionDAO.obtenerPorId(id_promocion);
  if (!existente) lanzarError('Promoción no encontrada', 404);

  let eliminado;
  try { eliminado = await PromocionDAO.eliminar(id_promocion); }
  catch (error) {
    if (error.code === '23503') lanzarError('Esta promoción tiene historial de uso. Puedes desactivarla para conservar su trazabilidad', 409);
    throw error;
  }
  if (!eliminado) lanzarError('No se pudo eliminar la promoción', 500);
  return { mensaje: 'Promoción eliminada correctamente' };
};

module.exports = {
  obtenerReferencia,
  obtenerTodas,
  crearPromocion,
  obtenerPorProducto,
  obtenerPorId,
  actualizarPromocion,
  cambiarEstadoPromocion,
  eliminarPromocion,
  validarPrecioPromocional,
};
