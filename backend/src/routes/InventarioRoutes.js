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
  query('pagina').optional().isString().bail()
    .isInt({ min: 1, max: 2147483647 }).withMessage('Página inválida').toInt(),
  query('limite').optional().isString().bail()
    .isInt({ min: 1, max: 100 }).withMessage('Límite inválido').toInt(),
  query('busqueda').optional().isString().bail().trim().isLength({ max: 150 }),
  query('id_categoria').optional().isString().bail().isInt({ min: 1, max: 2147483647 }).toInt(),
  query('activo').optional().isString().bail().isIn(['true', 'false']).toBoolean(),
  query('estado_stock').optional().isString().bail().isIn(['normal', 'agotado', 'poco_stock', 'sin_lotes']),
  query('estado_vencimiento').optional().isString().bail().isIn(['normal', 'vencido', 'proximo_a_vencer', 'sin_lotes']),
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
