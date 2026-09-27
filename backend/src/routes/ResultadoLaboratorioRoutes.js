const { Router } = require('express');
const { body, param, query } = require('express-validator');
const ResultadoLaboratorioController = require('../controllers/ResultadoLaboratorioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const subirPdfResultado = require('../middlewares/subirPdfResultado');

const router = Router();
const rolesResultado = verificarRol('dueno', 'administrador', 'laboratorista');

const validarId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarSubida = [
  body('id_paciente')
    .isInt({ min: 1 }).withMessage('id_paciente debe ser un entero positivo')
    .toInt(),
  body('categoria')
    .trim()
    .notEmpty().withMessage('categoria es requerida')
    .isLength({ max: 100 }).withMessage('categoria no puede superar los 100 caracteres'),
];

const validarListado = [
  query('id_paciente')
    .isInt({ min: 1 }).withMessage('id_paciente debe ser un entero positivo')
    .toInt(),
];

const validarAnulacion = [
  body('motivo_anulacion')
    .trim()
    .notEmpty().withMessage('motivo_anulacion es requerido')
    .isLength({ max: 500 }).withMessage('motivo_anulacion no puede superar los 500 caracteres'),
];

const validarCategorias = [
  query('id_laboratorio')
    .isInt({ min: 1 }).withMessage('id_laboratorio debe ser un entero positivo')
    .toInt(),
];

const validarToken = [
  param('token').isUUID().withMessage('token invalido'),
];

// GET    /api/resultados-laboratorio/categorias?id_laboratorio=
router.get(
  '/categorias',
  verificarToken,
  rolesResultado,
  validarCategorias,
  ResultadoLaboratorioController.categorias,
);

// GET    /api/resultados-laboratorio/publico/:token (publica, sin auth)
router.get(
  '/publico/:token',
  validarToken,
  ResultadoLaboratorioController.descargarPublico,
);

// GET    /api/resultados-laboratorio?id_paciente=
router.get('/', verificarToken, rolesResultado, validarListado, ResultadoLaboratorioController.listar);

// POST   /api/resultados-laboratorio
router.post(
  '/',
  verificarToken,
  rolesResultado,
  subirPdfResultado,
  validarSubida,
  ResultadoLaboratorioController.subir,
);

// PATCH  /api/resultados-laboratorio/:id/anular
router.patch(
  '/:id/anular',
  verificarToken,
  rolesResultado,
  validarId,
  validarAnulacion,
  ResultadoLaboratorioController.anular,
);

module.exports = router;
