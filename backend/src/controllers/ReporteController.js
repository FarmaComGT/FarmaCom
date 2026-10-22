const ReporteService = require('../services/ReporteService');
const asyncHandler = require('../middlewares/asyncHandler');

const obtenerResumenVentas = asyncHandler(async (req, res) => {
  const resumen = await ReporteService.obtenerResumenVentas(req.query);
  return res.status(200).json(resumen);
});

const obtenerSerieVentas = asyncHandler(async (req, res) => {
  const periodos = await ReporteService.obtenerSerieVentas(req.query);
  return res.status(200).json(periodos);
});

const obtenerMetodosPago = asyncHandler(async (req, res) => {
  const metodos = await ReporteService.obtenerMetodosPago(req.query);
  return res.status(200).json(metodos);
});

const obtenerResumenProductos = asyncHandler(async (req, res) => {
  const productos = await ReporteService.obtenerResumenProductos(req.query);
  return res.status(200).json(productos);
});

const obtenerTopProductos = asyncHandler(async (req, res) => {
  const productos = await ReporteService.obtenerTopProductos(req.query);
  return res.status(200).json(productos);
});

const obtenerRentabilidad = asyncHandler(async (req, res) => {
  const rentabilidad = await ReporteService.obtenerRentabilidad(req.query);
  return res.status(200).json(rentabilidad);
});

module.exports = {
  obtenerResumenVentas,
  obtenerSerieVentas,
  obtenerMetodosPago,
  obtenerResumenProductos,
  obtenerTopProductos,
  obtenerRentabilidad,
};
