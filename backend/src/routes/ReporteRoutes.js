const { Router } = require('express');
const { query } = require('express-validator');
const ReporteController = require('../controllers/ReporteController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');

const router = Router();
const rolesReportes = verificarRol('dueno', 'administrador');

const validarFiltrosReporte = [
  query('id_sucursal')
    .optional()
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
  query('fecha_desde')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('fecha_desde debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true }).withMessage('fecha_desde debe ser una fecha válida'),
  query('fecha_hasta')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('fecha_hasta debe tener formato YYYY-MM-DD')
    .isISO8601({ strict: true }).withMessage('fecha_hasta debe ser una fecha válida')
    .custom((fechaHasta, { req }) => (
      !req.query.fecha_desde || fechaHasta >= req.query.fecha_desde
    )).withMessage('fecha_hasta debe ser igual o posterior a fecha_desde'),
];

const validarFiltrosTopProductos = [
  ...validarFiltrosReporte,
  query('limite')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('limite debe ser un entero entre 1 y 20')
    .toInt(),
  query('criterio')
    .optional()
    .isIn(['cantidad', 'ingresos'])
    .withMessage('criterio debe ser cantidad o ingresos'),
];

const validarFiltrosSerieVentas = [
  ...validarFiltrosReporte,
  query('fecha_desde')
    .exists().withMessage('fecha_desde es requerida'),
  query('fecha_hasta')
    .exists().withMessage('fecha_hasta es requerida'),
  query('agrupacion')
    .exists().withMessage('agrupacion es requerida')
    .bail()
    .isIn(['dia', 'semana', 'mes'])
    .withMessage('agrupacion debe ser dia, semana o mes'),
];

router.get(
  '/ventas/resumen',
  verificarToken,
  rolesReportes,
  validarFiltrosReporte,
  ReporteController.obtenerResumenVentas,
);

router.get(
  '/ventas/serie',
  verificarToken,
  rolesReportes,
  validarFiltrosSerieVentas,
  ReporteController.obtenerSerieVentas,
);

router.get(
  '/ventas/metodos-pago',
  verificarToken,
  rolesReportes,
  validarFiltrosReporte,
  ReporteController.obtenerMetodosPago,
);

router.get(
  '/productos/top',
  verificarToken,
  rolesReportes,
  validarFiltrosTopProductos,
  ReporteController.obtenerTopProductos,
);

router.get(
  '/rentabilidad',
  verificarToken,
  rolesReportes,
  validarFiltrosReporte,
  ReporteController.obtenerRentabilidad,
);

module.exports = router;
