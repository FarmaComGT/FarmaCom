const { validationResult } = require('express-validator');
const HistorialPrecioLoteService = require('../services/HistorialPrecioLoteService');

const obtenerPorLote = async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const historial = await HistorialPrecioLoteService.obtenerPorLote(
      Number(req.params.id),
    );
    return res.status(200).json(historial);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = { obtenerPorLote };
