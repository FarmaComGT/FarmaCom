const { validationResult } = require('express-validator');
const path = require('path');
const ResultadoLaboratorioService = require('../services/ResultadoLaboratorioService');
const { RUTA_UPLOADS_RESULTADOS } = require('../config/almacenamiento');

const responderErrores = (req, res) => {
  const errores = validationResult(req);
  if (errores.isEmpty()) return false;
  res.status(400).json({ errores: errores.array() });
  return true;
};

const subir = async (req, res) => {
  if (responderErrores(req, res)) return;
  if (!req.file) {
    return res.status(400).json({ mensaje: 'El archivo PDF es requerido' });
  }
  try {
    const resultado = await ResultadoLaboratorioService.subirResultado({
      id_paciente: Number(req.body.id_paciente),
      categoria: req.body.categoria,
      buffer: req.file.buffer,
      id_usuario: req.usuario.id_usuario,
    });
    res.status(201).json(resultado);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const listar = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const resultados = await ResultadoLaboratorioService.listarPorPaciente(Number(req.query.id_paciente));
    res.status(200).json(resultados);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const anular = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const resultado = await ResultadoLaboratorioService.anularResultado(
      Number(req.params.id),
      req.body.motivo_anulacion,
      req.usuario.id_usuario,
    );
    res.status(200).json(resultado);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const categorias = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const categoriasSugeridas = await ResultadoLaboratorioService.obtenerCategoriasSugeridas(
      Number(req.query.id_laboratorio),
    );
    res.status(200).json(categoriasSugeridas);
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

const descargarPublico = async (req, res) => {
  if (responderErrores(req, res)) return;
  try {
    const resultado = await ResultadoLaboratorioService.obtenerPublico(req.params.token);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline');
    res.sendFile(path.join(RUTA_UPLOADS_RESULTADOS, resultado.ruta_archivo));
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

module.exports = { subir, listar, anular, categorias, descargarPublico };
