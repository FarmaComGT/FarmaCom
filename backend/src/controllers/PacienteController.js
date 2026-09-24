const { validationResult } = require('express-validator');
const PacienteService = require('../services/PacienteService');

const responderErrores = (req, res) => {
  const errores = validationResult(req);
  if (errores.isEmpty()) return false;
  res.status(400).json({ errores: errores.array() });
  return true;
};

const registrar = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const paciente = await PacienteService.registrarPaciente(req.body);
    res.status(201).json(paciente);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const buscar = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const resultado = await PacienteService.buscarPacientes({
      id_laboratorio: req.query.id_laboratorio,
      busqueda: req.query.busqueda,
      estado: req.query.estado,
      pagina: req.query.pagina,
      limite: req.query.limite,
    });
    res.status(200).json(resultado);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const paciente = await PacienteService.obtenerPorId(Number(req.params.id));
    res.status(200).json(paciente);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const actualizar = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const paciente = await PacienteService.actualizarPaciente(Number(req.params.id), req.body);
    res.status(200).json(paciente);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const anular = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const paciente = await PacienteService.anularPaciente(
      Number(req.params.id),
      req.body.motivo_anulacion,
    );
    res.status(200).json(paciente);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = { registrar, buscar, obtenerPorId, actualizar, anular };
