const { validationResult } = require('express-validator');
const BitacoraLaboratorioService = require('../services/BitacoraLaboratorioService');

const obtenerPorExpediente = async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const historial = await BitacoraLaboratorioService.obtenerPorExpediente(
      Number(req.params.id),
    );
    return res.status(200).json(historial);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = { obtenerPorExpediente };
