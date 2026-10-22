const HistorialCompraService = require('../services/HistorialCompraService');
const asyncHandler = require('../middlewares/asyncHandler');

const obtenerPorCliente = asyncHandler(async (req, res) => {
  const historial = await HistorialCompraService.obtenerPorCliente(
    Number(req.params.id),
    req.query,
    req.usuario,
  );
  return res.status(200).json(historial);
});

module.exports = { obtenerPorCliente };
