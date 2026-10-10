const ProveedorEmailDAO = require('../daos/ProveedorEmailDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const AppError = require('../errors/AppError');

const crearEmail = async ({ id_proveedor, correo }) => {
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!proveedor) {
    throw new AppError('El proveedor no existe', 404);
  }

  const duplicado = await ProveedorEmailDAO.obtenerPorCorreo(correo);
  if (duplicado) {
    throw new AppError('Ya existe ese correo registrado en un proveedor', 409);
  }

  return await ProveedorEmailDAO.crear({ id_proveedor, correo });
};

const obtenerPorProveedor = async (id_proveedor) => {
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!proveedor) {
    throw new AppError('El proveedor no existe', 404);
  }

  return await ProveedorEmailDAO.obtenerPorProveedor(id_proveedor);
};

const obtenerPorId = async (id_email) => {
  const email = await ProveedorEmailDAO.obtenerPorId(id_email);
  if (!email) {
    throw new AppError('Correo no encontrado', 404);
  }
  return email;
};

const actualizarEmail = async (id_email, { correo }) => {
  const existente = await ProveedorEmailDAO.obtenerPorId(id_email);
  if (!existente) {
    throw new AppError('Correo no encontrado', 404);
  }

  if (correo && correo !== existente.correo) {
    const duplicado = await ProveedorEmailDAO.obtenerPorCorreo(correo);
    if (duplicado) {
      throw new AppError('Ya existe ese correo registrado en un proveedor', 409);
    }
  }

  return await ProveedorEmailDAO.actualizar(id_email, { correo });
};

const eliminarEmail = async (id_email) => {
  const eliminado = await ProveedorEmailDAO.eliminar(id_email);
  if (!eliminado) {
    throw new AppError('Correo no encontrado', 404);
  }
  return { mensaje: 'Correo eliminado correctamente' };
};

module.exports = {
  crearEmail,
  obtenerPorProveedor,
  obtenerPorId,
  actualizarEmail,
  eliminarEmail,
};
