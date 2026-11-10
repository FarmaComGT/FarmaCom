const { Router } = require('express');
const { body, param, query } = require('express-validator');
const UsuarioController = require('../controllers/UsuarioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');
const { validarPaginacion, validarBusqueda } = require('../validators/paginacionValidators');
const rateLimit = require('express-rate-limit');

const router = Router();
const limitarRestablecimiento = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    keyGenerator: (req) => String(req.usuario.id_usuario),
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { mensaje: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

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
    body('contrasena').isString().withMessage('La contraseña es requerida').bail().trim(),
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
    body('contrasena_dueno')
        .isString().bail()
        .trim()
        .notEmpty().withMessage('Tu contraseña de dueño es requerida'),
    body('contrasena_nueva')
        .isString().bail()
        .trim(),
];

const validarCambioEstado = [
    body('estado').isIn(['activo', 'inactivo']).withMessage('Estado no válido'),
];

// Rutas

// GET    /api/usuarios
router.get('/',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarPaginacion,
    validarBusqueda(200),
    query('estado_usuario').optional().isString().bail()
        .isIn(['activo', 'inactivo']).withMessage('Estado no válido'),
    validateRequest,
    UsuarioController.obtenerTodos,
);

// GET    /api/usuarios/sucursal/:id_sucursal
router.get('/sucursal/:id_sucursal',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarParamIdSucursal,
    validarPaginacion,
    validarBusqueda(200),
    query('estado_usuario').optional().isString().bail()
        .isIn(['activo', 'inactivo']).withMessage('Estado no válido'),
    validateRequest,
    UsuarioController.obtenerPorSucursal,
);

// GET    /api/usuarios/:id
router.get('/:id',
    verificarToken,
    validarParamId,
    validateRequest,
    UsuarioController.obtenerPorId,
);

// POST   /api/usuarios
router.post('/',
    verificarToken,
    verificarRol('dueno'),
    validarCreacion,
    validateRequest,
    UsuarioController.crear,
);

// PUT    /api/usuarios/:id
router.put('/:id',
    verificarToken,
    verificarRol('dueno', 'administrador'),
    validarParamId,
    validarActualizacion,
    validateRequest,
    UsuarioController.actualizar,
);

// PATCH  /api/usuarios/:id/contrasena
router.patch('/:id/contrasena',
    verificarToken,
    verificarRol('dueno'),
    limitarRestablecimiento,
    validarParamId,
    validarCambioContrasena,
    validateRequest,
    UsuarioController.cambiarContrasena,
);

// PATCH  /api/usuarios/:id/estado
router.patch('/:id/estado',
    verificarToken,
    verificarRol('dueno'),
    validarParamId,
    validarCambioEstado,
    validateRequest,
    UsuarioController.cambiarEstado,
);

// DELETE /api/usuarios/:id
router.delete('/:id',
    verificarToken,
    verificarRol('dueno'),
    validarParamId,
    validateRequest,
    UsuarioController.eliminar,
);

module.exports = router;
