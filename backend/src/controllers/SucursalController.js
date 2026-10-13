const sucursalService = require('../services/SucursalService');
const asyncHandler = require('../middlewares/asyncHandler');

const crear = asyncHandler(async (req, res) => {
  const sucursal = await sucursalService.crearSucursal(req.body);
  return res.status(201).json(sucursal);
});

const obtenerTodas = asyncHandler(async (_req, res) => {
  const sucursales = await sucursalService.obtenerTodas();
  return res.status(200).json(sucursales);
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const sucursal = await sucursalService.obtenerPorId(Number(req.params.id));
  return res.status(200).json(sucursal);
});

const actualizar = asyncHandler(async (req, res) => {
  const sucursal = await sucursalService.actualizarSucursal(Number(req.params.id), req.body);
  return res.status(200).json(sucursal);
});

const eliminar = asyncHandler(async (req, res) => {
  const resultado = await sucursalService.eliminarSucursal(Number(req.params.id));
  return res.status(200).json(resultado);
});

module.exports = { crear, obtenerTodas, obtenerPorId, actualizar, eliminar };
