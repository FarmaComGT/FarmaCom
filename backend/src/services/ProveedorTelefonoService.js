const ProveedorTelefonoDAO = require('../daos/ProveedorTelefonoDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const AppError = require('../errors/AppError');

const crearTelefono = async ({ id_proveedor, numero }) => {
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!proveedor) {
    throw new AppError('El proveedor no existe', 404);
  }

  return await ProveedorTelefonoDAO.crear({ id_proveedor, numero });
};

const obtenerPorProveedor = async (id_proveedor) => {
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!proveedor) {
    throw new AppError('El proveedor no existe', 404);
  }

  return await ProveedorTelefonoDAO.obtenerPorProveedor(id_proveedor);
};

const obtenerPorId = async (id_telefono) => {
  const telefono = await ProveedorTelefonoDAO.obtenerPorId(id_telefono);
  if (!telefono) {
    throw new AppError('Teléfono no encontrado', 404);
  }
  return telefono;
};

const actualizarTelefono = async (id_telefono, { numero }) => {
  const existente = await ProveedorTelefonoDAO.obtenerPorId(id_telefono);
  if (!existente) {
    throw new AppError('Teléfono no encontrado', 404);
  }

  return await ProveedorTelefonoDAO.actualizar(id_telefono, { numero });
};

const eliminarTelefono = async (id_telefono) => {
  const eliminado = await ProveedorTelefonoDAO.eliminar(id_telefono);
  if (!eliminado) {
    throw new AppError('Teléfono no encontrado', 404);
  }
  return { mensaje: 'Teléfono eliminado correctamente' };
};

module.exports = {
  crearTelefono,
  obtenerPorProveedor,
  obtenerPorId,
  actualizarTelefono,
  eliminarTelefono,
};
