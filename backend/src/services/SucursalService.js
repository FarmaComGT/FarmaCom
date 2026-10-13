const SucursalDAO = require('../daos/SucursalDAO');
const AppError = require('../errors/AppError');

const crearSucursal = async ({ id_ciudad, nombre_sucursal, direccion }) => {
  const existente = await SucursalDAO.obtenerPorNombre(nombre_sucursal);
  if (existente) {
    throw new AppError('Ya existe una sucursal con ese nombre', 409);
  }

  return await SucursalDAO.crear({ id_ciudad, nombre_sucursal, direccion });
};

const obtenerTodas = async () => {
  return await SucursalDAO.obtenerTodos();
};

const obtenerPorId = async (id_sucursal) => {
  const sucursal = await SucursalDAO.obtenerPorId(id_sucursal);
  if (!sucursal) {
    throw new AppError('Sucursal no encontrada', 404);
  }
  return sucursal;
};

const actualizarSucursal = async (id_sucursal, campos) => {
  const existente = await SucursalDAO.obtenerPorId(id_sucursal);
  if (!existente) {
    throw new AppError('Sucursal no encontrada', 404);
  }

  if (campos.nombre_sucursal && 
      campos.nombre_sucursal.toLowerCase() !== existente.nombre_sucursal.toLowerCase()) {
    const duplicado = await SucursalDAO.obtenerPorNombre(campos.nombre_sucursal);
    if (duplicado) {
      throw new AppError('Ya existe una sucursal con ese nombre', 409);
    }
  }

  return await SucursalDAO.actualizar(id_sucursal, campos);
};

const eliminarSucursal = async (id_sucursal) => {
  const eliminado = await SucursalDAO.eliminar(id_sucursal);
  if (!eliminado) {
    throw new AppError('Sucursal no encontrada', 404);
  }
  return { mensaje: 'Sucursal eliminada correctamente' };
};

module.exports = {
  crearSucursal,
  obtenerTodas,
  obtenerPorId,
  actualizarSucursal,
  eliminarSucursal,
};
