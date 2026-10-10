const ProveedorDAO = require('../daos/ProveedorDAO');
const AppError = require('../errors/AppError');

const crearProveedor = async ({ nombre }) => {
  const existente = await ProveedorDAO.obtenerPorNombre(nombre);
  if (existente) {
    throw new AppError('Ya existe un proveedor con ese nombre', 409);
  }

  return await ProveedorDAO.crear({ nombre });
};

const obtenerTodos = async () => {
  return await ProveedorDAO.obtenerTodos();
};

const obtenerPorId = async (id_proveedor) => {
  const proveedor = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!proveedor) {
    throw new AppError('Proveedor no encontrado', 404);
  }
  return proveedor;
};

const actualizarProveedor = async (id_proveedor, campos) => {
  const existente = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!existente) {
    throw new AppError('Proveedor no encontrado', 404);
  }

  if (campos.nombre && campos.nombre.toLowerCase() !== existente.nombre.toLowerCase()) {
    const duplicado = await ProveedorDAO.obtenerPorNombre(campos.nombre);
    if (duplicado) {
      throw new AppError('Ya existe un proveedor con ese nombre', 409);
    }
  }

  return await ProveedorDAO.actualizar(id_proveedor, campos);
};

const cambiarEstado = async (id_proveedor, activo) => {
  const existente = await ProveedorDAO.obtenerPorId(id_proveedor);
  if (!existente) {
    throw new AppError('Proveedor no encontrado', 404);
  }

  return await ProveedorDAO.cambiarActivo(id_proveedor, activo);
};

const eliminarProveedor = async (id_proveedor) => {
  const eliminado = await ProveedorDAO.eliminar(id_proveedor);
  if (!eliminado) {
    throw new AppError('Proveedor no encontrado', 404);
  }
  return { mensaje: 'Proveedor eliminado correctamente' };
};

module.exports = {
  crearProveedor,
  obtenerTodos,
  obtenerPorId,
  actualizarProveedor,
  cambiarEstado,
  eliminarProveedor,
};
