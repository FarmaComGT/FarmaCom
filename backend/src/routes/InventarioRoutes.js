const { Router } = require('express');
const { param, query } = require('express-validator');
const InventarioController = require('../controllers/InventarioController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol   = require('../middlewares/verificarRol');
const validateRequest = require('../middlewares/validateRequest');

const router = Router({ mergeParams: true }); // mergeParams para heredar :id_sucursal

const validarParamIdSucursal = [
  param('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
];

const validarListado = [
  query('pagina').optional().isInt({ min: 1, max: 2147483647 }).withMessage('P?gina inv?lida').toInt(),
  query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('L?mite inv?lido').toInt(),
  query('busqueda').optional().trim().isLength({ max: 150 }),
  query('id_categoria').optional().isInt({ min: 1 }).toInt(),
  query('activo').optional().isIn(['true', 'false']).toBoolean(),
  query('estado_stock').optional().isIn(['normal', 'agotado', 'poco_stock', 'sin_lotes']),
  query('estado_vencimiento').optional().isIn(['normal', 'vencido', 'proximo_a_vencer', 'sin_lotes']),
];

// GET /api/sucursales/:id_sucursal/inventario
router.get(
  '/',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdSucursal,
  validarListado,
  validateRequest,
  InventarioController.obtenerInventario,
);

// GET /api/sucursales/:id_sucursal/inventario/resumen
router.get(
  '/resumen',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdSucursal,
  validateRequest,
  InventarioController.obtenerResumen,
);

module.exports = router;
