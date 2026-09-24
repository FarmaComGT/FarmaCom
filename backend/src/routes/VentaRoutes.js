const { Router } = require('express');
const {
  body,
  param,
  query,
} = require('express-validator');
const VentaController = require('../controllers/VentaController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();
const rolesVenta = verificarRol('dueno', 'administrador', 'dependiente');

const esMontoValido = (valor) => {
  const monto = String(valor);
  return /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(monto)
    && Number(monto) <= 9999999999.99;
};

const validarId = [
  param('id')
    .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo')
    .toInt(),
];

const validarDatosVenta = [
  body('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  body('id_sesion_caja')
    .isInt({ min: 1 }).withMessage('id_sesion_caja debe ser un entero positivo')
    .toInt(),
  body('id_cliente')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('id_cliente debe ser un entero positivo o null')
    .toInt(),
  body('detalles')
    .isArray({ min: 1 }).withMessage('detalles debe contener al menos un producto'),
  body('detalles.*.id_lote')
    .isInt({ min: 1 }).withMessage('Cada id_lote debe ser un entero positivo')
    .toInt(),
  body('detalles.*.cantidad')
    .isInt({ min: 1 }).withMessage('Cada cantidad debe ser un entero positivo')
    .toInt(),
];

const validarCreacion = [
  ...validarDatosVenta,
  body('metodo_pago')
    .equals('efectivo').withMessage('metodo_pago debe ser efectivo'),
  body('monto_recibido')
    .if(body('metodo_pago').equals('efectivo'))
    .custom(esMontoValido)
    .withMessage('monto_recibido debe ser un monto valido con maximo dos decimales')
    .toFloat(),
  body('monto_recibido')
    .optional({ nullable: true })
    .custom(esMontoValido)
    .withMessage('monto_recibido debe ser un monto valido con maximo dos decimales')
    .toFloat(),
];

const validarPagoPOS = [
  ...validarDatosVenta,
];

const validarExternalId = [
  param('externalId')
    .trim()
    .notEmpty().withMessage('externalId es requerido')
    .isLength({ max: 120 }).withMessage('externalId no puede superar 120 caracteres'),
];

const validarFiltros = [
  query('id_sucursal')
    .optional()
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  query('id_cliente')
    .optional()
    .isInt({ min: 1 }).withMessage('id_cliente debe ser un entero positivo')
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

const validarAsociacionCliente = [
  body('id_cliente')
    .custom((valor) => (
      valor === null
      || (Number.isInteger(Number(valor)) && Number(valor) > 0)
    ))
    .withMessage('id_cliente debe ser un entero positivo o null')
    .customSanitizer((valor) => (valor === null ? null : Number(valor))),
];

const validarAnulacion = [
  body('motivo_anulacion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('motivo_anulacion no puede superar los 500 caracteres'),
];

router.post(
  '/tarjeta/pos',
  verificarToken,
  rolesVenta,
  validarPagoPOS,
  VentaController.crearPagoPOS,
);

router.get(
  '/tarjeta/pos/:externalId',
  verificarToken,
  rolesVenta,
  validarExternalId,
  VentaController.obtenerEstadoPagoPOS,
);

router.post(
  '/',
  verificarToken,
  rolesVenta,
  validarCreacion,
  VentaController.crear,
);

router.get(
  '/',
  verificarToken,
  rolesVenta,
  validarFiltros,
  VentaController.obtenerTodas,
);

router.get(
  '/:id',
  verificarToken,
  rolesVenta,
  validarId,
  VentaController.obtenerPorId,
);

router.patch(
  '/:id/cliente',
  verificarToken,
  rolesVenta,
  validarId,
  validarAsociacionCliente,
  VentaController.asociarCliente,
);

router.delete(
  '/:id',
  verificarToken,
  rolesVenta,
  validarId,
  validarAnulacion,
  VentaController.anular,
);

module.exports = router;
