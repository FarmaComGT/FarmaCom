const HistorialPrecioLoteService = require('../services/HistorialPrecioLoteService');
const asyncHandler = require('../middlewares/asyncHandler');

const obtenerPorLote = asyncHandler(async (req, res) => {
  const historial = await HistorialPrecioLoteService.obtenerPorLote(
    Number(req.params.id),
  );
  return res.status(200).json(historial);
});

const obtenerPorProducto = asyncHandler(async (req, res) => {
  const historial = await HistorialPrecioLoteService.obtenerPorProducto(
    Number(req.params.id),
  );
  return res.status(200).json(historial);
});

module.exports = { obtenerPorLote, obtenerPorProducto };
