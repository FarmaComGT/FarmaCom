const { Router } = require('express');
const { body, param } = require('express-validator');
const UsuarioController = require('../controllers/UsuarioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();

// Validaciones de parámetros

const validarParamId = [
    param('id')
        .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo')
        .toInt(),
];

const validarParamIdSucursal = [
    param('id_sucursal')
        .isInt({ min: 1 }).withMessage('El id_sucursal debe ser un entero positivo')
        .toInt(),
];

// Validaciones de body

const validarCreacion = [
    body('id_sucursal').isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo'),
    body('nombre_usuario').trim().notEmpty().withMessage('nombre_usuario es requerido').isLength({ max: 100 }).withMessage('nombre_usuario no puede superar los 100 caracteres'),
    body('correo_usuario').isEmail().withMessage('correo_usuario no es válido').normalizeEmail(),
    body('contrasena').trim().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol').isIn(['dueno', 'administrador', 'dependiente', 'laboratorista']).withMessage('Rol no válido'),
    body('id_laboratorio')
        .if(body('rol').equals('laboratorista'))
        .isInt({ min: 1 }).withMessage('id_laboratorio debe ser un entero positivo')
        .toInt(),
];

const validarActualizacion = [
    body('correo_usuario')
        .optional()
        .isEmail().withMessage('correo_usuario no es válido')
        .normalizeEmail(),
    body('nombre_usuario')
        .optional()
        .trim()
        .notEmpty().withMessage('nombre_usuario no puede estar vacío')
        .isLength({ max: 100 }).withMessage('nombre_usuario no puede superar los 100 caracteres'),
    body('rol')
        .optional()
        .isIn(['dueno', 'administrador', 'dependiente', 'laboratorista']).withMessage('Rol no válido'),
    body('id_sucursal')
        .optional()
        .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo'),
    body('id_laboratorio')
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage('id_laboratorio debe ser un entero positivo')
        .toInt(),
];

const validarCambioContrasena = [
    body('contrasena_actual')
        .trim()
        .notEmpty().withMessage('contrasena_actual es requerida'),
    body('contrasena_nueva')
        .trim()
        .isLength({ min: 6 }).withMessage('La contraseña nueva debe tener al menos 6 caracteres'),
];

const validarCambioEstado = [
    body('estado').isIn(['activo', 'inactivo']).withMessage('Estado no válido'),
];

// Rutas

// GET    /api/usuarios
router.get('/',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    UsuarioController.obtenerTodos,
);

// GET    /api/usuarios/sucursal/:id_sucursal
router.get('/sucursal/:id_sucursal',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarParamIdSucursal,
    UsuarioController.obtenerPorSucursal,
);

// GET    /api/usuarios/:id
router.get('/:id',
    verificarToken,
    validarParamId,
    UsuarioController.obtenerPorId,
);

// POST   /api/usuarios
router.post('/',
    verificarToken,
    verificarRol('dueno'),
    validarCreacion,
    UsuarioController.crear,
);

// PUT    /api/usuarios/:id
router.put('/:id',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarParamId,
    validarActualizacion,
    UsuarioController.actualizar,
);

// PATCH  /api/usuarios/:id/contrasena
router.patch('/:id/contrasena',
    verificarToken,
    validarParamId,
    validarCambioContrasena,
    UsuarioController.cambiarContrasena,
);

// PATCH  /api/usuarios/:id/estado
router.patch('/:id/estado',
    verificarToken,
    verificarRol('dueno'),
    validarParamId,
    validarCambioEstado,
    UsuarioController.cambiarEstado,
);

// DELETE /api/usuarios/:id
router.delete('/:id',
    verificarToken,
    verificarRol('dueno'),
    validarParamId,
    UsuarioController.eliminar,
);

module.exports = router;
