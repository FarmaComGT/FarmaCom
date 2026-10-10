const CiudadDAO = require('../daos/CiudadDAO');
const AppError = require('../errors/AppError');

const crearCiudad = async ({ nombre_ciudad }) => {
  const existente = await CiudadDAO.obtenerPorNombre(nombre_ciudad);
  if (existente) {
    throw new AppError('Ya existe una ciudad con ese nombre', 409);
  }

  return CiudadDAO.crear({ nombre_ciudad });
};

const obtenerTodas = async () => {
  return CiudadDAO.obtenerTodas();
};

const obtenerPorId = async (id_ciudad) => {
  const ciudad = await CiudadDAO.obtenerPorId(id_ciudad);
  if (!ciudad) {
    throw new AppError('Ciudad no encontrada', 404);
  }
  return ciudad;
};

const actualizarCiudad = async (id_ciudad, campos) => {
  const existente = await CiudadDAO.obtenerPorId(id_ciudad);
  if (!existente) {
    throw new AppError('Ciudad no encontrada', 404);
  }

  if (
    campos.nombre_ciudad &&
    campos.nombre_ciudad.toLowerCase() !== existente.nombre_ciudad.toLowerCase()
  ) {
    const duplicado = await CiudadDAO.obtenerPorNombre(campos.nombre_ciudad);
    if (duplicado) {
      throw new AppError('Ya existe una ciudad con ese nombre', 409);
    }
  }

  return CiudadDAO.actualizar(id_ciudad, campos);
};

const eliminarCiudad = async (id_ciudad) => {
  try {
    const eliminado = await CiudadDAO.eliminar(id_ciudad);
    if (!eliminado) {
      throw new AppError('Ciudad no encontrada', 404);
    }
    return { mensaje: 'Ciudad eliminada correctamente' };
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError('No se puede eliminar una ciudad asociada a sucursales', 409);
    }
    throw error;
  }
};

module.exports = {
  crearCiudad,
  obtenerTodas,
  obtenerPorId,
  actualizarCiudad,
  eliminarCiudad,
};
