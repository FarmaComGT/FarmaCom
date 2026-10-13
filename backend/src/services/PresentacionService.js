const PresentacionDAO = require('../daos/PresentacionDAO');
const AppError = require('../errors/AppError');

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const crearPresentacion = async ({ nombre }) => {
  const existente = await PresentacionDAO.obtenerPorNombre(nombre);
  if (existente) lanzarError('Ya existe una presentación con ese nombre', 409);
  return PresentacionDAO.crear({ nombre });
};

const obtenerTodas = () => PresentacionDAO.obtenerTodos();

const obtenerPorId = async (id_presentacion) => {
  const presentacion = await PresentacionDAO.obtenerPorId(id_presentacion);
  if (!presentacion) lanzarError('Presentación no encontrada', 404);
  return presentacion;
};

const actualizarPresentacion = async (id_presentacion, campos) => {
  const existente = await PresentacionDAO.obtenerPorId(id_presentacion);
  if (!existente) lanzarError('Presentación no encontrada', 404);

  if (campos.nombre && campos.nombre.toLowerCase() !== existente.nombre.toLowerCase()) {
    const duplicado = await PresentacionDAO.obtenerPorNombre(campos.nombre);
    if (duplicado) lanzarError('Ya existe una presentación con ese nombre', 409);
  }

  return PresentacionDAO.actualizar(id_presentacion, campos);
};

const eliminarPresentacion = async (id_presentacion) => {
  const existente = await PresentacionDAO.obtenerPorId(id_presentacion);
  if (!existente) lanzarError('Presentación no encontrada', 404);
  if (existente.productos_asociados > 0) {
    lanzarError('No se puede eliminar una presentación asociada a productos', 409);
  }

  await PresentacionDAO.eliminar(id_presentacion);
  return { mensaje: 'Presentación eliminada correctamente' };
};

module.exports = {
  crearPresentacion,
  obtenerTodas,
  obtenerPorId,
  actualizarPresentacion,
  eliminarPresentacion,
};
