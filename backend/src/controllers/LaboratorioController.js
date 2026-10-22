const LaboratorioService = require('../services/LaboratorioService');
const asyncHandler = require('../middlewares/asyncHandler');

const listar = asyncHandler(async (_req, res) => {
  const laboratorios = await LaboratorioService.listarActivos();
  return res.status(200).json(laboratorios);
});

const crear = asyncHandler(async (req, res) => {
  const laboratorio = await LaboratorioService.crear(req.body);
  return res.status(201).json(laboratorio);
});

const actualizar = asyncHandler(async (req, res) => {
  const laboratorio = await LaboratorioService.actualizar(Number(req.params.id), req.body);
  return res.status(200).json(laboratorio);
});

module.exports = { listar, crear, actualizar };
