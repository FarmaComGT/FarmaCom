const { Router } = require('express');
const { body, param } = require('express-validator');
const LoteController = require('../controllers/LoteController');
const verificarToken = require('../middlewares/verificarToken');
const verificarRol   = require('../middlewares/verificarRol');

const router = Router();

// Validadores comunes

const validarParamId = [
  param('id')
    .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo')
    .toInt(),
];

const validarParamIdSucursal = [
  param('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),
];

const validarParamIdProducto = [
  param('id_producto')
    .isInt({ min: 1 }).withMessage('id_producto debe ser un entero positivo')
    .toInt(),
];

// Validadores de body

const validarCreacion = [
  body('id_producto')
    .isInt({ min: 1 }).withMessage('id_producto debe ser un entero positivo')
    .toInt(),

  body('id_proveedor')
    .isInt({ min: 1 }).withMessage('id_proveedor debe ser un entero positivo')
    .toInt(),

  body('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),

  body('numero_lote')
    .trim()
    .notEmpty().withMessage('numero_lote es requerido')
    .isLength({ max: 100 }).withMessage('numero_lote no puede superar los 100 caracteres'),

  body('fecha_vencimiento')
    .isISO8601().withMessage('fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD)')
    .toDate(),

  body('cantidad_ingresada')
    .isInt({ min: 1 }).withMessage('cantidad_ingresada debe ser un entero mayor a 0')
    .toInt(),

  body('precio_venta')
    .isFloat({ min: 0 }).withMessage('precio_venta debe ser mayor o igual a 0')
    .toFloat(),

  body('precio_compra')
    .optional()
    .isFloat({ min: 0 }).withMessage('precio_compra debe ser mayor o igual a 0')
    .toFloat(),

  body('margen_ganancia')
    .isFloat({ min: 0, max: 9999.9999 }).withMessage('margen_ganancia debe estar entre 0 y 9999.9999')
    .toFloat(),

  body('precio_mayoreo')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('precio_mayoreo debe ser mayor o igual a 0')
    .toFloat(),

  body('cantidad_mayoreo')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('cantidad_mayoreo debe ser un entero mayor a 0')
    .toInt(),
];

const validarActualizacion = [
  body('id_producto')
    .optional()
    .isInt({ min: 1 }).withMessage('id_producto debe ser un entero positivo')
    .toInt(),

  body('id_proveedor')
    .optional()
    .isInt({ min: 1 }).withMessage('id_proveedor debe ser un entero positivo')
    .toInt(),

  body('id_sucursal')
    .optional()
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),

  body('numero_lote')
    .optional()
    .trim()
    .notEmpty().withMessage('numero_lote no puede estar vacío')
    .isLength({ max: 100 }).withMessage('numero_lote no puede superar los 100 caracteres'),

  body('fecha_vencimiento')
    .optional()
    .isISO8601().withMessage('fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD)')
    .toDate(),

  body('cantidad_ingresada')
    .optional()
    .isInt({ min: 1 }).withMessage('cantidad_ingresada debe ser un entero mayor a 0')
    .toInt(),

  body('stock_actual')
    .optional()
    .isInt({ min: 0 }).withMessage('stock_actual debe ser un entero mayor o igual a 0')
    .toInt(),

  body('precio_venta')
    .optional()
    .isFloat({ min: 0 }).withMessage('precio_venta debe ser mayor o igual a 0')
    .toFloat(),

  body('precio_compra')
    .optional()
    .isFloat({ min: 0 }).withMessage('precio_compra debe ser mayor o igual a 0')
    .toFloat(),

  body('margen_ganancia')
    .optional()
    .isFloat({ min: 0, max: 9999.9999 }).withMessage('margen_ganancia debe estar entre 0 y 9999.9999')
    .toFloat(),

  body('precio_mayoreo')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('precio_mayoreo debe ser mayor o igual a 0')
    .toFloat(),

  body('cantidad_mayoreo')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('cantidad_mayoreo debe ser un entero mayor a 0')
    .toInt(),

  body('limpiar_mayoreo')
    .optional()
    .isBoolean().withMessage('limpiar_mayoreo debe ser un booleano')
    .toBoolean(),
];

//  Rutas — Lote

// POST   /api/lotes
router.post('/',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarCreacion,
  LoteController.crear,
);

// GET    /api/lotes/alertas
// Debe declararse antes de /:id para que "alertas" no se interprete como un id.
router.get('/alertas',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  LoteController.obtenerAlertas,
);

// PATCH  /api/lotes/:id
router.patch('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  validarActualizacion,
  LoteController.actualizar,
);

// DELETE /api/lotes/:id
router.delete('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamId,
  LoteController.eliminar,
);

// GET    /api/lotes/:id
router.get('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  LoteController.obtenerPorId,
);

//  Rutas anidadas
// Estas rutas son invocadas cuando el router se monta bajo:
//   /api/sucursales/:id_sucursal/lotes
//   /api/productos/:id_producto/lotes

// GET  /api/sucursales/:id_sucursal/lotes
router.get('/sucursal/:id_sucursal',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdSucursal,
  LoteController.obtenerPorSucursal,
);

// GET  /api/productos/:id_producto/lotes
router.get('/producto/:id_producto',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamIdProducto,
  LoteController.obtenerPorProducto,
);

// GET  /api/sucursales/:id_sucursal/lotes/alertas
router.get('/sucursal/:id_sucursal/alertas',
  verificarToken,
  verificarRol('dueno', 'administrador'),
  validarParamIdSucursal,
  LoteController.obtenerAlertas,
);

module.exports = router;
