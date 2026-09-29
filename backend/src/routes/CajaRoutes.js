const { Router } = require('express');
const {
  body,
  param,
  query,
} = require('express-validator');
const CajaController = require('../controllers/CajaController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();
const rolesOperacion = verificarRol('dueno', 'administrador', 'dependiente');
const rolesAdministracion = verificarRol('dueno', 'administrador');

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

const validarFecha = (campo) => query(campo)
  .optional()
  .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${campo} debe tener formato YYYY-MM-DD`)
  .isISO8601({ strict: true }).withMessage(`${campo} debe ser una fecha válida`);

const validarFiltrosCajas = [
  query('id_sucursal')
    .optional()
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  query('activa')
    .optional()
    .isBoolean().withMessage('activa debe ser true o false')
    .toBoolean(),
];

const validarCreacionCaja = [
  body('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  body('nombre')
    .trim()
    .notEmpty().withMessage('nombre es requerido')
    .isLength({ max: 100 }).withMessage('nombre no puede superar los 100 caracteres'),
];

const validarActualizacionCaja = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('nombre no puede estar vacío')
    .isLength({ max: 100 }).withMessage('nombre no puede superar los 100 caracteres'),
  body('activa')
    .optional()
    .isBoolean().withMessage('activa debe ser true o false')
    .toBoolean(),
  body().custom((valor) => {
    if (valor.nombre === undefined && valor.activa === undefined) {
      throw new Error('Debes enviar nombre o activa');
    }
    return true;
  }),
];

const validarApertura = [
  body('turno')
    .isIn(['mañana', 'tarde', 'noche'])
    .withMessage('turno debe ser mañana, tarde o noche'),
  body('fondo_inicial')
    .custom(esMontoValido)
    .withMessage('fondo_inicial debe ser un monto válido con máximo dos decimales'),
];

const validarMovimiento = [
  body('tipo')
    .isIn(['entrada', 'salida'])
    .withMessage('tipo debe ser entrada o salida'),
  body('monto')
    .custom((valor) => esMontoValido(valor) && Number(valor) > 0)
    .withMessage('monto debe ser mayor que cero y tener máximo dos decimales'),
  body('motivo')
    .trim()
    .notEmpty().withMessage('motivo es requerido')
    .isLength({ max: 500 }).withMessage('motivo no puede superar los 500 caracteres'),
];

const validarCierre = [
  body('efectivo_contado')
    .custom(esMontoValido)
    .withMessage('efectivo_contado debe ser un monto válido con máximo dos decimales'),
  body('observaciones')
    .optional({ nullable: true })
    .trim()
    .notEmpty().withMessage('observaciones no puede estar vacío')
    .isLength({ max: 500 }).withMessage('observaciones no puede superar los 500 caracteres'),
];

const validarFiltrosCierres = [
  query('id_sucursal')
    .optional()
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  query('id_caja')
    .optional()
    .isInt({ min: 1 }).withMessage('id_caja debe ser un entero positivo')
    .toInt(),
  validarFecha('fecha_desde'),
  validarFecha('fecha_hasta'),
];

const validarResumen = [
  query('fecha')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('fecha debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true }).withMessage('fecha debe ser una fecha válida'),
  query('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  query('id_caja')
    .optional()
    .isInt({ min: 1 }).withMessage('id_caja debe ser un entero positivo')
    .toInt(),
];

router.get(
  '/cierres/resumen-diario',
  verificarToken,
  rolesAdministracion,
  validarResumen,
  CajaController.obtenerResumenDiario,
);

router.get(
  '/cierres',
  verificarToken,
  rolesAdministracion,
  validarFiltrosCierres,
  CajaController.obtenerCierres,
);

router.post(
  '/sesiones/:id/movimientos',
  verificarToken,
  rolesOperacion,
  validarId,
  validarMovimiento,
  CajaController.registrarMovimiento,
);

router.post(
  '/sesiones/:id/cierre',
  verificarToken,
  rolesOperacion,
  validarId,
  validarCierre,
  CajaController.cerrarSesion,
);

router.get('/', verificarToken, rolesOperacion, validarFiltrosCajas, CajaController.obtenerTodas);

router.post(
  '/',
  verificarToken,
  rolesAdministracion,
  validarCreacionCaja,
  CajaController.crear,
);

router.patch(
  '/:id',
  verificarToken,
  rolesAdministracion,
  validarId,
  validarActualizacionCaja,
  CajaController.actualizar,
);

router.post(
  '/:id/sesiones',
  verificarToken,
  rolesOperacion,
  validarId,
  validarApertura,
  CajaController.abrirSesion,
);

router.get(
  '/:id/sesion-actual',
  verificarToken,
  rolesOperacion,
  validarId,
  CajaController.obtenerSesionActual,
);

module.exports = router;
