const CasaEmailDAO = require('../daos/CasaEmailDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const AppError = require('../errors/AppError');

const crearEmail = async ({ id_casa, correo }) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('La casa farmacéutica no existe', 404);
  }

  const duplicado = await CasaEmailDAO.obtenerPorCorreo(correo);
  if (duplicado) {
    throw new AppError('Ya existe ese correo registrado en una casa farmacéutica', 409);
  }

  return await CasaEmailDAO.crear({ id_casa, correo });
};

const obtenerPorCasa = async (id_casa) => {
  const casa = await CasaFarmaceuticaDAO.obtenerPorId(id_casa);
  if (!casa) {
    throw new AppError('La casa farmacéutica no existe', 404);
  }

  return await CasaEmailDAO.obtenerPorCasa(id_casa);
};

const obtenerPorId = async (id_email) => {
  const email = await CasaEmailDAO.obtenerPorId(id_email);
  if (!email) {
    throw new AppError('Correo no encontrado', 404);
  }
  return email;
};

const actualizarEmail = async (id_email, { correo }) => {
  const existente = await CasaEmailDAO.obtenerPorId(id_email);
  if (!existente) {
    throw new AppError('Correo no encontrado', 404);
  }

  if (correo && correo !== existente.correo) {
    const duplicado = await CasaEmailDAO.obtenerPorCorreo(correo);
    if (duplicado) {
      throw new AppError('Ya existe ese correo registrado en una casa farmacéutica', 409);
    }
  }

  return await CasaEmailDAO.actualizar(id_email, { correo });
};

const eliminarEmail = async (id_email) => {
  const eliminado = await CasaEmailDAO.eliminar(id_email);
  if (!eliminado) {
    throw new AppError('Correo no encontrado', 404);
  }
  return { mensaje: 'Correo eliminado correctamente' };
};

module.exports = {
  crearEmail,
  obtenerPorCasa,
  obtenerPorId,
  actualizarEmail,
  eliminarEmail,
};
