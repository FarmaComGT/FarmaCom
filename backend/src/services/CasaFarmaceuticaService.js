const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const AppError = require('../errors/AppError');

const crearCasa = async ({ nombre }) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorNombre(nombre);
  if (existente) {
    throw new AppError('Ya existe una casa farmacéutica con ese nombre', 409);
  }

  return await CasaFarmaceuticaDAO.crear({ nombre });
};

const obtenerTodas = async () => {
  return await CasaFarmaceuticaDAO.obtenerTodos();
};

const obtenerPorId = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }
  return casa;
};

const actualizarCasa = async (id_casa, campos) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!existente) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }

  if (campos.nombre && campos.nombre.toLowerCase() !== existente.nombre.toLowerCase()) {
    const duplicado = await CasaFarmaceuticaDAO.obtenerPorNombre(campos.nombre);
    if (duplicado) {
      throw new AppError('Ya existe una casa farmacéutica con ese nombre', 409);
    }
  }

  return await CasaFarmaceuticaDAO.actualizar(id_casa, campos);
};

const cambiarEstado = async (id_casa, activo) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!existente) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }

  return await CasaFarmaceuticaDAO.cambiarActivo(id_casa, activo);
};

const eliminarCasa = async (id_casa) => {
  const eliminado = await CasaFarmaceuticaDAO.eliminar(id_casa);
  if (!eliminado) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }
  return { mensaje: 'Casa farmacéutica eliminada correctamente' };
};

const obtenerProveedoresVinculados = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('Casa farmacéutica no encontrada', 404);
  }

  return await CasaFarmaceuticaDAO.obtenerProveedoresVinculados(id_casa);
};

module.exports = {
  crearCasa,
  obtenerTodas,
  obtenerPorId,
  actualizarCasa,
  cambiarEstado,
  eliminarCasa,
  obtenerProveedoresVinculados,
};
