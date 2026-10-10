const { Router } = require('express');
const { body, param, query } = require('express-validator');
const ClienteController = require('../controllers/ClienteController');
const HistorialCompraController = require('../controllers/HistorialCompraController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

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

module.exports = router;
