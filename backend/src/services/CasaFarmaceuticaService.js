const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');

const crearCasa = async ({ nombre }) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorNombre(nombre);
  if (existente) {
    const error = new Error('Ya existe una casa farmacéutica con ese nombre');
    error.status = 409;
    throw error;
  }

  return await CasaFarmaceuticaDAO.crear({ nombre });
};

const obtenerTodas = async () => {
  return await CasaFarmaceuticaDAO.obtenerTodos();
};

const obtenerPorId = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    const error = new Error('Casa farmacéutica no encontrada');
    error.status = 404;
    throw error;
  }
  return casa;
};

const actualizarCasa = async (id_casa, campos) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!existente) {
    const error = new Error('Casa farmacéutica no encontrada');
    error.status = 404;
    throw error;
  }

  if (campos.nombre && campos.nombre.toLowerCase() !== existente.nombre.toLowerCase()) {
    const duplicado = await CasaFarmaceuticaDAO.obtenerPorNombre(campos.nombre);
    if (duplicado) {
      const error = new Error('Ya existe una casa farmacéutica con ese nombre');
      error.status = 409;
      throw error;
    }
  }

  return await CasaFarmaceuticaDAO.actualizar(id_casa, campos);
};

const cambiarEstado = async (id_casa, activo) => {
  const existente = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!existente) {
    const error = new Error('Casa farmacéutica no encontrada');
    error.status = 404;
    throw error;
  }

  return await CasaFarmaceuticaDAO.cambiarActivo(id_casa, activo);
};

const eliminarCasa = async (id_casa) => {
  const eliminado = await CasaFarmaceuticaDAO.eliminar(id_casa);
  if (!eliminado) {
    const error = new Error('Casa farmacéutica no encontrada');
    error.status = 404;
    throw error;
  }
  return { mensaje: 'Casa farmacéutica eliminada correctamente' };
};

module.exports = {
  crearCasa,
  obtenerTodas,
  obtenerPorId,
  actualizarCasa,
  cambiarEstado,
  eliminarCasa,
};