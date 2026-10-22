const path = require('path');
const ResultadoLaboratorioService = require('../services/ResultadoLaboratorioService');
const { RUTA_UPLOADS_RESULTADOS } = require('../config/almacenamiento');
const AppError = require('../errors/AppError');
const asyncHandler = require('../middlewares/asyncHandler');

const subir = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('El archivo PDF es requerido', 400);
  }
  const resultado = await ResultadoLaboratorioService.subirResultado({
    id_paciente: Number(req.body.id_paciente),
    categoria: req.body.categoria,
    buffer: req.file.buffer,
    usuario: req.usuario,
  });
  return res.status(201).json(resultado);
});

const listar = asyncHandler(async (req, res) => {
  const resultados = await ResultadoLaboratorioService.listarPorPaciente(
    Number(req.query.id_paciente),
    req.usuario,
  );
  return res.status(200).json(resultados);
});

const anular = asyncHandler(async (req, res) => {
  const resultado = await ResultadoLaboratorioService.anularResultado(
    Number(req.params.id),
    req.body.motivo_anulacion,
    req.usuario,
  );
  return res.status(200).json(resultado);
});

const categorias = asyncHandler(async (req, res) => {
  const categoriasSugeridas = await ResultadoLaboratorioService.obtenerCategoriasSugeridas(
    Number(req.query.id_laboratorio),
    req.usuario,
  );
  return res.status(200).json(categoriasSugeridas);
});

const descargarPublico = asyncHandler(async (req, res) => {
  const resultado = await ResultadoLaboratorioService.obtenerPublico(req.params.token);
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', 'inline');
  return res.sendFile(path.join(RUTA_UPLOADS_RESULTADOS, resultado.ruta_archivo));
});

module.exports = { subir, listar, anular, categorias, descargarPublico };
