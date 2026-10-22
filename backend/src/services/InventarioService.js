const InventarioDAO = require('../daos/InventarioDAO');
const pool = require('../database/db');
const AppError = require('../errors/AppError');

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const verificarSucursal = async (id_sucursal) => {
  const { rows } = await pool.query(
    'SELECT id_sucursal FROM sucursal WHERE id_sucursal = $1',
    [id_sucursal],
  );
  if (rows.length === 0) lanzarError('Sucursal no encontrada', 404);
};

const obtenerInventarioPorSucursal = async (id_sucursal) => {
  await verificarSucursal(id_sucursal);
  return await InventarioDAO.obtenerPorSucursal(id_sucursal);
};

const obtenerResumenPorSucursal = async (id_sucursal) => {
  await verificarSucursal(id_sucursal);
  return await InventarioDAO.obtenerResumenPorSucursal(id_sucursal);
};

module.exports = {
  obtenerInventarioPorSucursal,
  obtenerResumenPorSucursal,
};
