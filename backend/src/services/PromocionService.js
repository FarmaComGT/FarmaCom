const PromocionDAO    = require('../daos/PromocionDAO');
const ProductoDAO     = require('../daos/ProductoDAO');
const AppError        = require('../errors/AppError');

// Helpers

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const validarFechas = (fecha_inicio, fecha_fin) => {
  const inicio = new Date(fecha_inicio);
  const fin    = new Date(fecha_fin);
  if (isNaN(inicio.getTime())) lanzarError('fecha_inicio no es una fecha válida', 400);
  if (isNaN(fin.getTime()))    lanzarError('fecha_fin no es una fecha válida', 400);
  if (fin <= inicio)           lanzarError('fecha_fin debe ser posterior a fecha_inicio', 400);
};

// Operaciones

const crearPromocion = async (id_producto, datos) => {
  const { id_sucursal, cantidad_minima, precio_promocion, fecha_inicio, fecha_fin } = datos;

  // Verificar que el producto exista
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);

  if (cantidad_minima <= 0)  lanzarError('La cantidad mínima debe ser mayor a 0', 400);
  if (precio_promocion <= 0) lanzarError('El precio de promoción debe ser mayor a 0', 400);

  validarFechas(fecha_inicio, fecha_fin);

  // Validar que no exista una promoción activa solapada para el mismo
  // producto y sucursal
  const solapada = await PromocionDAO.existeActivaSolapada({
    id_producto,
    id_sucursal,
    fecha_inicio,
    fecha_fin,
  });
  if (solapada) {
    lanzarError(
      'Ya existe una promoción activa para este producto y sucursal en ese rango de fechas',
      409,
    );
  }

  return await PromocionDAO.crear({ id_producto, id_sucursal, cantidad_minima, precio_promocion, fecha_inicio, fecha_fin });
};

const obtenerPorProducto = async (id_producto) => {
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);
  return await PromocionDAO.obtenerPorProducto(id_producto);
};

const obtenerPorId = async (id_promocion) => {
  const promocion = await PromocionDAO.obtenerPorId(id_promocion);
  if (!promocion) lanzarError('Promoción no encontrada', 404);
  return promocion;
};

const actualizarPromocion = async (id_promocion, campos) => {
  const existente = await PromocionDAO.obtenerPorId(id_promocion);
  if (!existente) lanzarError('Promoción no encontrada', 404);

  if (campos.cantidad_minima !== undefined && campos.cantidad_minima <= 0) {
    lanzarError('La cantidad mínima debe ser mayor a 0', 400);
  }

  if (campos.precio_promocion !== undefined && campos.precio_promocion <= 0) {
    lanzarError('El precio de promoción debe ser mayor a 0', 400);
  }

  // Si se actualizan fechas, validar coherencia y solapamiento
  const fecha_inicio = campos.fecha_inicio ?? existente.fecha_inicio;
  const fecha_fin    = campos.fecha_fin    ?? existente.fecha_fin;

  if (campos.fecha_inicio || campos.fecha_fin) {
    validarFechas(fecha_inicio, fecha_fin);

    const solapada = await PromocionDAO.existeActivaSolapada({
      id_producto:     existente.id_producto,
      id_sucursal:     existente.id_sucursal,
      fecha_inicio,
      fecha_fin,
      excluir_id:      id_promocion,
    });
    if (solapada) {
      lanzarError(
        'Ya existe una promoción activa para este producto y sucursal en ese rango de fechas',
        409,
      );
    }
  }

  const actualizado = await PromocionDAO.actualizar(id_promocion, campos);
  if (!actualizado) lanzarError('No se pudo actualizar la promoción', 500);
  return actualizado;
};

const desactivarPromocion = async (id_promocion) => {
  const existente = await PromocionDAO.obtenerPorId(id_promocion);
  if (!existente)        lanzarError('Promoción no encontrada', 404);
  if (!existente.activo) lanzarError('La promoción ya está desactivada', 409);

  const resultado = await PromocionDAO.cambiarActivo(id_promocion, false);
  return { mensaje: 'Promoción desactivada correctamente', promocion: resultado };
};

// Borrado físico
const eliminarPromocion = async (id_promocion) => {
  const existente = await PromocionDAO.obtenerPorId(id_promocion);
  if (!existente) lanzarError('Promoción no encontrada', 404);

  const eliminado = await PromocionDAO.eliminar(id_promocion);
  if (!eliminado) lanzarError('No se pudo eliminar la promoción', 500);
  return { mensaje: 'Promoción eliminada correctamente' };
};

module.exports = {
  crearPromocion,
  obtenerPorProducto,
  obtenerPorId,
  actualizarPromocion,
  desactivarPromocion,
  eliminarPromocion,
};
