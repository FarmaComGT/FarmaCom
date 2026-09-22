const { validationResult } = require('express-validator');
const ReporteService = require('../services/ReporteService');

const responderErrores = (req, res) => {
  const errores = validationResult(req);
  if (errores.isEmpty()) return false;

  res.status(400).json({ errores: errores.array() });
  return true;
};

const obtenerResumenVentas = async (req, res) => {
  if (responderErrores(req, res)) return;

  try {
    const resumen = await ReporteService.obtenerResumenVentas(req.query);
    return res.status(200).json(resumen);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerSerieVentas = async (req, res) => {
  if (responderErrores(req, res)) return;

  try {
    const periodos = await ReporteService.obtenerSerieVentas(req.query);
    return res.status(200).json(periodos);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerMetodosPago = async (req, res) => {
  if (responderErrores(req, res)) return;

  try {
    const metodos = await ReporteService.obtenerMetodosPago(req.query);
    return res.status(200).json(metodos);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerTopProductos = async (req, res) => {
  if (responderErrores(req, res)) return;

  try {
    const productos = await ReporteService.obtenerTopProductos(req.query);
    return res.status(200).json(productos);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerRentabilidad = async (req, res) => {
  if (responderErrores(req, res)) return;

  try {
    const rentabilidad = await ReporteService.obtenerRentabilidad(req.query);
    return res.status(200).json(rentabilidad);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = {
  obtenerResumenVentas,
  obtenerSerieVentas,
  obtenerMetodosPago,
  obtenerTopProductos,
  obtenerRentabilidad,
};
