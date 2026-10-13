const ciudadService = require('../services/CiudadService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const ciudad = await ciudadService.crearCiudad(req.body);
  return res.status(201).json(ciudad);
});

const obtenerTodas = asyncHandler(async (_req, res) => {
  const ciudades = await ciudadService.obtenerTodas();
  return res.status(200).json(ciudades);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const ciudad = await ciudadService.obtenerPorId(Number(req.params.id));
  return res.status(200).json(ciudad);
});

const actualizar = asyncHandler(async (req, res) => {
  const ciudad = await ciudadService.actualizarCiudad(Number(req.params.id), req.body);
  return res.status(200).json(ciudad);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await ciudadService.eliminarCiudad(Number(req.params.id));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerTodas, obtenerPorId, actualizar, eliminar };
