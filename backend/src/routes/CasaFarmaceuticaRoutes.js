const { Router } = require('express');
const { body, param } = require('express-validator');
const CasaFarmaceuticaController = require('../controllers/CasaFarmaceuticaController');
const CasaTelefonoController = require('../controllers/CasaTelefonoController');
const CasaEmailController = require('../controllers/CasaEmailController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();

// Validadores

const validarParamId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
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

// Rutas: CasaFarmaceutica

// GET    /api/casas
router.get('/', verificarToken, CasaFarmaceuticaController.obtenerTodas);

// GET    /api/casas/:id
router.get(
  '/:id',
  verificarToken,
  validarParamId,
  validateRequest,
  CasaFarmaceuticaController.obtenerPorId,
);

// POST   /api/casas
router.post(
  '/',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarCreacion,
  validateRequest,
  CasaFarmaceuticaController.crear,
);

// PUT    /api/casas/:id
router.put(
  '/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarActualizacion,
  validateRequest,
  CasaFarmaceuticaController.actualizar,
);

// PATCH  /api/casas/:id/estado
router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarCambioEstado,
  validateRequest,
  CasaFarmaceuticaController.cambiarEstado,
);

// DELETE /api/casas/:id
router.delete(
  '/:id',
  verificarToken,
  verificarRol('dueno'),
  validarParamId,
  validateRequest,
  CasaFarmaceuticaController.eliminar,
);

// GET  /api/casas/:id/proveedores
// Devuelve la lista de proveedores vinculados a la casa (tabla casa_proveedor)
router.get(
  '/:id/proveedores',
  verificarToken,
  validarParamId,
  validateRequest,
  CasaFarmaceuticaController.obtenerProveedoresVinculados,
);

// Rutas anidadas: Teléfonos

// GET    /api/casas/:id_casa/telefonos
router.get('/:id_casa/telefonos', verificarToken, CasaTelefonoController.obtenerPorCasa);

// POST   /api/casas/:id_casa/telefonos
router.post(
  '/:id_casa/telefonos',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarTelefonoCreacion,
  CasaTelefonoController.crear,
);

// PUT    /api/casas/:id_casa/telefonos/:id_telefono
router.put(
  '/:id_casa/telefonos/:id_telefono',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarTelefonoActualizacion,
  CasaTelefonoController.actualizar,
);

// DELETE /api/casas/:id_casa/telefonos/:id_telefono
router.delete(
  '/:id_casa/telefonos/:id_telefono',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  CasaTelefonoController.eliminar,
);

// Rutas anidadas: Correos

// GET    /api/casas/:id_casa/correos
router.get('/:id_casa/correos', verificarToken, CasaEmailController.obtenerPorCasa);

// POST   /api/casas/:id_casa/correos
router.post(
  '/:id_casa/correos',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarEmailCreacion,
  CasaEmailController.crear,
);

// PUT    /api/casas/:id_casa/correos/:id_email
router.put(
  '/:id_casa/correos/:id_email',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarEmailActualizacion,
  CasaEmailController.actualizar,
);

// DELETE /api/casas/:id_casa/correos/:id_email
router.delete(
  '/:id_casa/correos/:id_email',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  CasaEmailController.eliminar,
);


module.exports = router;
