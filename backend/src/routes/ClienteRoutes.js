const { Router } = require('express');
const { body, param, query } = require('express-validator');
const ClienteController = require('../controllers/ClienteController');
const ClienteContactoController = require('../controllers/ClienteContactoController');
const HistorialCompraController = require('../controllers/HistorialCompraController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');
const {
  normalizarTelefono,
  normalizarCorreo,
  esTelefonoValido,
  esCorreoValido,
} = require('../utils/contactoCliente');

const router = Router();
const rolesHistorial = verificarRol('dueno', 'administrador', 'dependiente');
const validarId = [param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt()];
const validarNombre = (requerido) => body('nombre_cliente')
  [requerido ? 'notEmpty' : 'optional']()
  .trim()
  .notEmpty().withMessage('nombre_cliente es requerido')
  .isLength({ max: 150 }).withMessage('nombre_cliente no puede superar los 150 caracteres');
const validarObservaciones = body('observaciones')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 2000 }).withMessage('observaciones no puede superar los 2000 caracteres');
const validarNit = body('nit')
  .optional({ nullable: true })
  .customSanitizer((valor) => {
    if (typeof valor !== 'string') return valor;
    const normalizado = valor.trim().toUpperCase().replace(/\s+/g, '');
    return normalizado || null;
  })
  .custom((valor) => valor === null || /^[0-9]{1,15}-?[0-9K]$/.test(valor))
  .withMessage('nit debe contener dígitos, con guion opcional y verificador numérico o K')
  .isLength({ max: 20 }).withMessage('nit no puede superar los 20 caracteres');
const validarIdTelefono = [
  param('id_telefono').isInt({ min: 1 }).withMessage('El id_telefono debe ser un entero positivo').toInt(),
];
const validarIdEmail = [
  param('id_email').isInt({ min: 1 }).withMessage('El id_email debe ser un entero positivo').toInt(),
];
const validarTelefono = [
  body('numero')
    .exists({ values: 'null' }).withMessage('El número es requerido')
    .bail()
    .customSanitizer(normalizarTelefono)
    .custom(esTelefonoValido)
    .withMessage('El teléfono debe tener entre 8 y 15 dígitos, con + opcional al inicio'),
];
const validarCorreo = [
  body('correo')
    .exists({ values: 'null' }).withMessage('El correo es requerido')
    .bail()
    .customSanitizer(normalizarCorreo)
    .custom(esCorreoValido)
    .withMessage('El correo no tiene un formato válido'),
];
const validarFiltrosHistorial = [
  query('id_sucursal')
    .optional()
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  query('estado')
    .optional()
    .isIn(['completada', 'anulada'])
    .withMessage('estado debe ser completada o anulada'),
  query('fecha_desde')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('fecha_desde debe tener formato YYYY-MM-DD'),
  query('fecha_hasta')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('fecha_hasta debe tener formato YYYY-MM-DD'),
];

router.get('/', verificarToken, ClienteController.obtenerTodas);
router.get(
  '/:id/historial-compras',
  verificarToken,
  rolesHistorial,
  validarId,
  validarFiltrosHistorial,
  validateRequest,
  HistorialCompraController.obtenerPorCliente,
);
router.get('/:id', verificarToken, validarId, validateRequest, ClienteController.obtenerPorId);
router.post(
  '/',
  verificarToken,
  [validarNombre(true), validarNit, validarObservaciones],
  validateRequest,
  ClienteController.crear,
);
router.put(
  '/:id',
  verificarToken,
  validarId,
  [validarNombre(false), validarNit, validarObservaciones],
  validateRequest,
  ClienteController.actualizar,
);
router.delete('/:id', verificarToken, validarId, validateRequest, ClienteController.eliminar);

// Teléfonos del cliente: /api/clientes/:id/telefonos
router.get(
  '/:id/telefonos',
  verificarToken,
  validarId,
  validateRequest,
  ClienteContactoController.obtenerTelefonos,
);
router.post(
  '/:id/telefonos',
  verificarToken,
  validarId,
  validarTelefono,
  validateRequest,
  ClienteContactoController.crearTelefono,
);
router.put(
  '/:id/telefonos/:id_telefono',
  verificarToken,
  validarId,
  validarIdTelefono,
  validarTelefono,
  validateRequest,
  ClienteContactoController.actualizarTelefono,
);
router.delete(
  '/:id/telefonos/:id_telefono',
  verificarToken,
  validarId,
  validarIdTelefono,
  validateRequest,
  ClienteContactoController.eliminarTelefono,
);

// Correos del cliente: /api/clientes/:id/correos
router.get(
  '/:id/correos',
  verificarToken,
  validarId,
  validateRequest,
  ClienteContactoController.obtenerCorreos,
);
router.post(
  '/:id/correos',
  verificarToken,
  validarId,
  validarCorreo,
  validateRequest,
  ClienteContactoController.crearCorreo,
);
router.put(
  '/:id/correos/:id_email',
  verificarToken,
  validarId,
  validarIdEmail,
  validarCorreo,
  validateRequest,
  ClienteContactoController.actualizarCorreo,
);
router.delete(
  '/:id/correos/:id_email',
  verificarToken,
  validarId,
  validarIdEmail,
  validateRequest,
  ClienteContactoController.eliminarCorreo,
);

module.exports = router;
