const { Router } = require('express');
const { body, param } = require('express-validator');
const TelefonoSucursalController = require('../controllers/TelefonoSucursalController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router({ mergeParams: true });

const validarIdSucursal = [
    param('id_sucursal')
    .isInt({ min: 1 }).withMessage('El id_sucursal debe ser un entero positivo')
    .toInt(),
];

const validarId = [
    param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarCreacion = [
    body('numero')
    .notEmpty().withMessage('El número es requerido')
    .isLength({ max: 20 }).withMessage('El número no puede superar los 20 caracteres'),
];

const validarActualizacion = [
    body('numero')
    .optional()
    .notEmpty().withMessage('El número no puede estar vacío')
    .isLength({ max: 20 }).withMessage('El número no puede superar los 20 caracteres'),
];

// GET    /api/sucursales/:id_sucursal/telefonos
router.get(
    '/',
    verificarToken,
    validarIdSucursal,
    validateRequest,
    TelefonoSucursalController.obtenerPorSucursal,
);

// POST   /api/sucursales/:id_sucursal/telefonos
router.post(
    '/',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarIdSucursal,
    validarCreacion,
    validateRequest,
    TelefonoSucursalController.crear,
);

// GET    /api/telefonos/:id
router.get('/:id', verificarToken, validarId, validateRequest, TelefonoSucursalController.obtenerPorId);

// PUT    /api/telefonos/:id
router.put(
    '/:id',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarId,
    validarActualizacion,
    validateRequest,
    TelefonoSucursalController.actualizar,
);

// DELETE /api/telefonos/:id
router.delete(
    '/:id',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarId,
    validateRequest,
    TelefonoSucursalController.eliminar,
);

module.exports = router;
