const CasaFarmaceuticaService = require('../services/CasaFarmaceuticaService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const casa = await CasaFarmaceuticaService.crearCasa(req.body);
  return res.status(201).json(casa);
});

const obtenerTodas = asyncHandler(async (_req, res) => {
  const casas = await CasaFarmaceuticaService.obtenerTodas();
  return res.status(200).json(casas);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const casa = await CasaFarmaceuticaService.obtenerPorId(Number(req.params.id));
  return res.status(200).json(casa);
});

const actualizar = asyncHandler(async (req, res) => {
  const casa = await CasaFarmaceuticaService.actualizarCasa(Number(req.params.id), req.body);
  return res.status(200).json(casa);
});

// PATCH /api/casas/:id/estado — activa o desactiva
const cambiarEstado = asyncHandler(async (req, res) => {
  const { activo } = req.body;

  const resultado = await CasaFarmaceuticaService.cambiarEstado(Number(req.params.id), activo);
  return res.status(200).json(resultado);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await CasaFarmaceuticaService.eliminarCasa(Number(req.params.id));
  return res.status(200).json(resultado);
});

// GET /api/casas/:id/proveedores
const obtenerProveedoresVinculados = asyncHandler(async (req, res) => {
  const proveedores = await CasaFarmaceuticaService.obtenerProveedoresVinculados(
    Number(req.params.id),
  );
  return res.status(200).json(proveedores);
});

module.exports = {
  crear,
  obtenerTodas,
  obtenerPorId,
  actualizar,
  cambiarEstado,
  eliminar,
  obtenerProveedoresVinculados,
};
