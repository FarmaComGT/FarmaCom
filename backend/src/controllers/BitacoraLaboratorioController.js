const BitacoraLaboratorioService = require('../services/BitacoraLaboratorioService');
const asyncHandler = require('../middlewares/asyncHandler');

const obtenerPorExpediente = asyncHandler(async (req, res) => {
  const historial = await BitacoraLaboratorioService.obtenerPorExpediente(
    Number(req.params.id),
  );
  return res.status(200).json(historial);
});

module.exports = { obtenerPorExpediente };
