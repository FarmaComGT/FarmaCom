const { Router } = require('express');
const { body, param } = require('express-validator');
const CorreoSucursalController = require('../controllers/CorreoSucursalController');
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
    body('correo')
    .notEmpty().withMessage('El correo es requerido')
    .isEmail().withMessage('El correo no tiene un formato válido'),
];

const validarActualizacion = [
    body('correo')
    .optional()
    .isEmail().withMessage('El correo no tiene un formato válido'),
];

// GET    /api/sucursales/:id_sucursal/correos
router.get(
    '/',
    verificarToken,
    validarIdSucursal,
    validateRequest,
    CorreoSucursalController.obtenerPorSucursal,
);

// POST   /api/sucursales/:id_sucursal/correos
router.post(
    '/',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarIdSucursal,
    validarCreacion,
    validateRequest,
    CorreoSucursalController.crear,
);

// GET    /api/correos/:id
router.get('/:id', verificarToken, validarId, validateRequest, CorreoSucursalController.obtenerPorId);

// PUT    /api/correos/:id
router.put(
    '/:id',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarId,
    validarActualizacion,
    validateRequest,
    CorreoSucursalController.actualizar,
);

// DELETE /api/correos/:id
router.delete(
    '/:id',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarId,
    validateRequest,
    CorreoSucursalController.eliminar,
);

module.exports = router;
