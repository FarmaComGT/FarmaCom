const PresentacionService = require('../services/PresentacionService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const presentacion = await PresentacionService.crearPresentacion(req.body);
  return res.status(201).json(presentacion);
});

const obtenerTodas = asyncHandler(async (_req, res) => (
  res.status(200).json(await PresentacionService.obtenerTodas())
));

const obtenerPorId = asyncHandler(async (req, res) => (
  res.status(200).json(await PresentacionService.obtenerPorId(Number(req.params.id)))
));

const actualizar = asyncHandler(async (req, res) => {
  const presentacion = await PresentacionService.actualizarPresentacion(
    Number(req.params.id),
    req.body,
  );
  return res.status(200).json(presentacion);
});

const eliminar = asyncHandler(async (req, res) => (
  res.status(200).json(await PresentacionService.eliminarPresentacion(Number(req.params.id)))
));

module.exports = { crear, obtenerTodas, obtenerPorId, actualizar, eliminar };
