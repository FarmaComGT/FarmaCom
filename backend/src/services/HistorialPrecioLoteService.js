const LoteDAO = require('../daos/LoteDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');

const lanzarError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

const obtenerPorLote = async (id_lote) => {
  const lote = await LoteDAO.obtenerPorId(id_lote);
  if (!lote) lanzarError('Lote no encontrado', 404);

  return await HistorialPrecioLoteDAO.obtenerPorLote(id_lote);
};

module.exports = { obtenerPorLote };
