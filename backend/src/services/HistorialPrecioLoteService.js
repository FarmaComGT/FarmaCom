const LoteDAO = require('../daos/LoteDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');
const AppError = require('../errors/AppError');

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const obtenerPorLote = async (id_lote) => {
  const lote = await LoteDAO.obtenerPorId(id_lote);
  if (!lote) lanzarError('Lote no encontrado', 404);

  return await HistorialPrecioLoteDAO.obtenerPorLote(id_lote);
};

const obtenerPorProducto = async (id_producto) => {
  const producto = await ProductoDAO.obtenerPorId(id_producto);
  if (!producto) lanzarError('Producto no encontrado', 404);

  return await HistorialPrecioLoteDAO.obtenerPorProducto(id_producto);
};

module.exports = { obtenerPorLote, obtenerPorProducto };
