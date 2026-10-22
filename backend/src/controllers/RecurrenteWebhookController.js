const VentaService = require('../services/VentaService');
const asyncHandler = require('../middlewares/asyncHandler');

const recibir = asyncHandler(async (req, res) => {
  const resultado = await VentaService.procesarWebhookRecurrente(
    req.body,
    req.headers,
  );
  return res.status(200).json(resultado);
});

module.exports = { recibir };
