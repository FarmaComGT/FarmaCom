const LoteDAO = require('../daos/LoteDAO');
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

module.exports = { obtenerPorLote };
