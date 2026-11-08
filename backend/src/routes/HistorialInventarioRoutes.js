const { Router } = require('express');
const { query } = require('express-validator');
const HistorialInventarioController = require('../controllers/HistorialInventarioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');
const { validarPaginacion } = require('../validators/paginacionValidators');

const router = Router();
const TIPOS_CAMBIO = [
  'alta', 'modificacion', 'cambio_estado', 'eliminacion',
  'entrada', 'venta', 'anulacion', 'ajuste',
];

const validarFiltros = [
  query('id_producto').optional().isInt({ min: 1 })
    .withMessage('id_producto debe ser un entero positivo').toInt(),
  query('lote').optional().trim().isLength({ min: 1, max: 100 })
    .withMessage('lote debe tener entre 1 y 100 caracteres'),
  query('id_sucursal').optional().isInt({ min: 1 })
    .withMessage('id_sucursal debe ser un entero positivo').toInt(),
  query('fecha_desde').optional().isISO8601({ strict: true })
    .withMessage('fecha_desde debe tener formato YYYY-MM-DD'),
  query('fecha_hasta').optional().isISO8601({ strict: true })
    .withMessage('fecha_hasta debe tener formato YYYY-MM-DD'),
  query('usuario').optional().trim().isLength({ min: 1, max: 100 })
    .withMessage('usuario debe tener entre 1 y 100 caracteres'),
  query('tipo_cambio').optional().isIn(TIPOS_CAMBIO)
    .withMessage('tipo_cambio no es valido'),
  ...validarPaginacion,
  query().custom((_valor, { req }) => {
    if (req.query.fecha_desde && req.query.fecha_hasta
      && req.query.fecha_desde > req.query.fecha_hasta) {
      throw new Error('fecha_desde no puede ser posterior a fecha_hasta');
    }
    return true;
  }),
];

router.get(
  '/historial',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarFiltros,
  validateRequest,
  HistorialInventarioController.obtener,
);

module.exports = router;
