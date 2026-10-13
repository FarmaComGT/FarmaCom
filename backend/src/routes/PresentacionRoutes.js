const { Router } = require('express');
const { body, param } = require('express-validator');
const PresentacionController = require('../controllers/PresentacionController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();

const validarId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarNombre = (opcional = false) => {
  let validacion = body('nombre');
  if (opcional) validacion = validacion.optional();
  return validacion
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no puede superar los 100 caracteres');
};

router.get('/', verificarToken, PresentacionController.obtenerTodas);
router.get('/:id', verificarToken, validarId, validateRequest, PresentacionController.obtenerPorId);
router.post(
  '/',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  [validarNombre()],
  validateRequest,
  PresentacionController.crear,
);
router.put(
  '/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarId,
  [validarNombre(true)],
  validateRequest,
  PresentacionController.actualizar,
);
router.delete(
  '/:id',
  verificarToken,
  verificarRol('dueno'),
  validarId,
  validateRequest,
  PresentacionController.eliminar,
);

module.exports = router;
