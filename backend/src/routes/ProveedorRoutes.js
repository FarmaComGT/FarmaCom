const { Router } = require('express');
const { body, param } = require('express-validator');
const ProveedorController = require('../controllers/ProveedorController');
const ProveedorTelefonoController = require('../controllers/ProveedorTelefonoController');
const ProveedorEmailController = require('../controllers/ProveedorEmailController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();

// Validadores

const validarParamId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarIdProveedor = [
  param('id_proveedor')
    .isInt({ min: 1 }).withMessage('El id_proveedor debe ser un entero positivo')
    .toInt(),
];

const validarIdTelefono = [
  param('id_telefono')
    .isInt({ min: 1 }).withMessage('El id_telefono debe ser un entero positivo')
    .toInt(),
];

const validarIdEmail = [
  param('id_email').isInt({ min: 1 }).withMessage('El id_email debe ser un entero positivo').toInt(),
];

const validarCreacion = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('nombre es requerido')
    .isLength({ max: 150 }).withMessage('nombre no puede superar los 150 caracteres'),
];

const validarActualizacion = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('nombre no puede estar vacío')
    .isLength({ max: 150 }).withMessage('nombre no puede superar los 150 caracteres'),
];

const validarCambioEstado = [
  body('activo')
    .isBoolean({ strict: true }).withMessage('El campo "activo" debe ser un booleano'),
];

const validarTelefonoCreacion = [
  body('numero')
    .notEmpty().withMessage('El número es requerido')
    .isLength({ max: 20 }).withMessage('El número no puede superar los 20 caracteres'),
];

const validarTelefonoActualizacion = [
  body('numero')
    .optional()
    .notEmpty().withMessage('El número no puede estar vacío')
    .isLength({ max: 20 }).withMessage('El número no puede superar los 20 caracteres'),
];

const validarEmailCreacion = [
  body('correo')
    .notEmpty().withMessage('El correo es requerido')
    .isEmail().withMessage('El correo no tiene un formato válido'),
];

const validarEmailActualizacion = [
  body('correo')
    .optional()
    .isEmail().withMessage('El correo no tiene un formato válido'),
];

// Rutas: Proveedor

// GET    /api/proveedores
router.get('/', verificarToken, ProveedorController.obtenerTodos);

// GET    /api/proveedores/:id
router.get('/:id', verificarToken, validarParamId, validateRequest, ProveedorController.obtenerPorId);

// POST   /api/proveedores
router.post(
  '/',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarCreacion,
  validateRequest,
  ProveedorController.crear,
);

// PUT    /api/proveedores/:id
router.put(
  '/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarActualizacion,
  validateRequest,
  ProveedorController.actualizar,
);

// PATCH  /api/proveedores/:id/estado
router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarCambioEstado,
  validateRequest,
  ProveedorController.cambiarEstado,
);

// DELETE /api/proveedores/:id
router.delete(
  '/:id',
  verificarToken,
  verificarRol('dueno'),
  validarParamId,
  validateRequest,
  ProveedorController.eliminar,
);

// Rutas anidadas: Teléfonos

// GET    /api/proveedores/:id_proveedor/telefonos
router.get(
  '/:id_proveedor/telefonos',
  verificarToken,
  validarIdProveedor,
  validateRequest,
  ProveedorTelefonoController.obtenerPorProveedor,
);

// POST   /api/proveedores/:id_proveedor/telefonos
router.post(
  '/:id_proveedor/telefonos',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarIdProveedor,
  validarTelefonoCreacion,
  validateRequest,
  ProveedorTelefonoController.crear,
);

// PUT   /api/:id_proveedor/telefonos/:id_telefono
router.put(
  '/:id_proveedor/telefonos/:id_telefono',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarIdProveedor,
  validarIdTelefono,
  validarTelefonoActualizacion,
  validateRequest,
  ProveedorTelefonoController.actualizar,
);

// DELETE   /api/:id_proveedor/telefonos/:id_telefono
router.delete(
  '/:id_proveedor/telefonos/:id_telefono',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarIdProveedor,
  validarIdTelefono,
  validateRequest,
  ProveedorTelefonoController.eliminar,
);

// Rutas anidadas: Correos

// GET    /api/proveedores/:id_proveedor/correos
router.get(
  '/:id_proveedor/correos',
  verificarToken,
  validarIdProveedor,
  validateRequest,
  ProveedorEmailController.obtenerPorProveedor,
);

// POST   /api/proveedores/:id_proveedor/correos
router.post(
  '/:id_proveedor/correos',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarIdProveedor,
  validarEmailCreacion,
  validateRequest,
  ProveedorEmailController.crear,
);

// PUT   /api/:id_proveedor/correos/:id_email
router.put(
  '/:id_proveedor/correos/:id_email',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarIdProveedor,
  validarIdEmail,
  validarEmailActualizacion,
  validateRequest,
  ProveedorEmailController.actualizar,
);

// DELETE   /api/:id_proveedor/correos/:id_email
router.delete(
  '/:id_proveedor/correos/:id_email',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarIdProveedor,
  validarIdEmail,
  validateRequest,
  ProveedorEmailController.eliminar,
);

module.exports = router;
