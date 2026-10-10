const CasaTelefonoDAO = require('../daos/CasaTelefonoDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const AppError = require('../errors/AppError');

const crearTelefono = async ({ id_casa, numero }) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('La casa farmacéutica no existe', 404);
  }

  return await CasaTelefonoDAO.crear({ id_casa, numero });
};

const obtenerPorCasa = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('La casa farmacéutica no existe', 404);
  }

  return await CasaTelefonoDAO.obtenerPorCasa(id_casa);
};

const obtenerPorId = async (id_telefono) => {
  const telefono = await CasaTelefonoDAO.obtenerPorId(id_telefono);
  if (!telefono) {
    throw new AppError('Teléfono no encontrado', 404);
  }
  return telefono;
};

const actualizarTelefono = async (id_telefono, { numero }) => {
  const existente = await CasaTelefonoDAO.obtenerPorId(id_telefono);
  if (!existente) {
    throw new AppError('Teléfono no encontrado', 404);
  }

  return await CasaTelefonoDAO.actualizar(id_telefono, { numero });
};

const eliminarTelefono = async (id_telefono) => {
  const eliminado = await CasaTelefonoDAO.eliminar(id_telefono);
  if (!eliminado) {
    throw new AppError('Teléfono no encontrado', 404);
  }
  return { mensaje: 'Teléfono eliminado correctamente' };
};

module.exports = {
  crearTelefono,
  obtenerPorCasa,
  obtenerPorId,
  actualizarTelefono,
  eliminarTelefono,
};
