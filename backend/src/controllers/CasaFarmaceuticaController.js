const { validationResult } = require('express-validator');
const CasaFarmaceuticaService = require('../services/CasaFarmaceuticaService');

const crear = async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const casa = await CasaFarmaceuticaService.crearCasa(req.body);
    return res.status(201).json(casa);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerTodas = async (req, res) => {
  try {
    const casas = await CasaFarmaceuticaService.obtenerTodas();
    return res.status(200).json(casas);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const casa = await CasaFarmaceuticaService.obtenerPorId(Number(req.params.id));
    return res.status(200).json(casa);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const actualizar = async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const casa = await CasaFarmaceuticaService.actualizarCasa(Number(req.params.id), req.body);
    return res.status(200).json(casa);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

// PATCH /api/casas/:id/estado — activa o desactiva
const cambiarEstado = async (req, res) => {
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ mensaje: 'El campo "activo" debe ser un booleano' });
  }

  try {
    const resultado = await CasaFarmaceuticaService.cambiarEstado(Number(req.params.id), activo);
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    const resultado = await CasaFarmaceuticaService.eliminarCasa(Number(req.params.id));
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = { crear, obtenerTodas, obtenerPorId, actualizar, cambiarEstado, eliminar };