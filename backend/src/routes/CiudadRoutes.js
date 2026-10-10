const { Router } = require('express');
const { body, param } = require('express-validator');
const CiudadController = require('../controllers/CiudadController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();

const validarParamId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarCreacion = [
  body('nombre_ciudad')
    .trim()
    .notEmpty().withMessage('nombre_ciudad es requerido')
    .isLength({ max: 100 }).withMessage('nombre_ciudad no puede superar los 100 caracteres'),
];

const validarActualizacion = [
  body('nombre_ciudad')
    .optional()
    .trim()
    .notEmpty().withMessage('nombre_ciudad no puede estar vacío')
    .isLength({ max: 100 }).withMessage('nombre_ciudad no puede superar los 100 caracteres'),
];

router.get('/', verificarToken, CiudadController.obtenerTodas);
router.get(
  '/:id',
  verificarToken,
  validarParamId,
  validateRequest,
  CiudadController.obtenerPorId,
);
router.post(
  '/',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarCreacion,
  validateRequest,
  CiudadController.crear,
);
router.put(
  '/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarActualizacion,
  validateRequest,
  CiudadController.actualizar,
);
router.delete(
  '/:id',
  verificarToken,
  verificarRol('dueno'),
  validarParamId,
  validateRequest,
  CiudadController.eliminar,
);

module.exports = router;
