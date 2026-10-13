const { Router } = require('express');
const { body, param } = require('express-validator');
const SucursalController = require('../controllers/SucursalController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();

const validarParamId = [param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt()];

const validarCreacion = [
    body('id_ciudad')
        .isInt({ min: 1 }).withMessage('id_ciudad debe ser un entero positivo')
        .toInt(),

    body('nombre_sucursal')
        .trim()
        .notEmpty().withMessage('nombre_sucursal es requerido')
        .isLength({ max: 100 }).withMessage('nombre_sucursal no puede superar los 100 caracteres'),

    body('direccion')
        .trim()
        .notEmpty().withMessage('direccion es requerida')
        .isLength({ max: 255 }).withMessage('direccion no puede superar los 255 caracteres'),
];

const validarActualizacion = [
    body('id_ciudad')
        .optional()
        .isInt({ min: 1 }).withMessage('id_ciudad debe ser un entero positivo')
        .toInt(),

    body('nombre_sucursal')
        .optional()
        .trim()
        .notEmpty().withMessage('nombre_sucursal no puede estar vacío')
        .isLength({ max: 100 }).withMessage('nombre_sucursal no puede superar los 100 caracteres'),

    body('direccion')
        .optional()
        .trim()
        .notEmpty().withMessage('direccion no puede estar vacía')
        .isLength({ max: 255 }).withMessage('direccion no puede superar los 255 caracteres'),
];

// Rutas

// GET    /api/sucursales
router.get('/', verificarToken, SucursalController.obtenerTodas);

// GET    /api/sucursales/:id
router.get('/:id', verificarToken, validarParamId, validateRequest, SucursalController.obtenerPorId);

// POST   /api/sucursales
router.post(
    '/',
    verificarToken,
    verificarRol('dueno'),
    validarCreacion,
    validateRequest,
    SucursalController.crear,
);

// PUT    /api/sucursales/:id
router.put('/:id',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarParamId,
    validarActualizacion,
    validateRequest,
    SucursalController.actualizar,
);

// DELETE /api/sucursales/:id
router.delete('/:id',
    verificarToken,
    verificarRol('dueno'),
    validarParamId,
    validateRequest,
    SucursalController.eliminar,
);

module.exports = router;
