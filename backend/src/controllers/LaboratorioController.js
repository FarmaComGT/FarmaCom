const LaboratorioService = require('../services/LaboratorioService');
const { validationResult } = require('express-validator');

const responderErrores = (req, res) => {
  const errores = validationResult(req);
  if (errores.isEmpty()) return false;
  res.status(400).json({ errores: errores.array() });
  return true;
};

const listar = async (req, res) => {
  try {
    const laboratorios = await LaboratorioService.listarActivos();
    res.status(200).json(laboratorios);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const crear = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const laboratorio = await LaboratorioService.crear(req.body);
    res.status(201).json(laboratorio);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const actualizar = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const laboratorio = await LaboratorioService.actualizar(Number(req.params.id), req.body);
    res.status(200).json(laboratorio);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = { listar, crear, actualizar };
