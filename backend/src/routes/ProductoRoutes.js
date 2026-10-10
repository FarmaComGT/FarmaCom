const { Router } = require('express');
const { body, param, query } = require('express-validator');
const ProductoController      = require('../controllers/ProductoController');
const PromocionController     = require('../controllers/PromocionController');
const verificarToken          = require('../middlewares/verificarToken');
const verificarRol            = require('../middlewares/verificarRol');
const validateRequest         = require('../middlewares/validateRequest');

const router = Router();

const normalizarConcentracion = (valor) => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') return valor;
  return valor.trim() || null;
};

const validarConcentracionOpcional = () => body('concentracion')
  .optional({ nullable: true })
  .customSanitizer(normalizarConcentracion)
  .custom((valor) => valor === null || typeof valor === 'string')
  .withMessage('La concentración debe ser texto')
  .custom((valor) => valor === null || valor.length <= 50)
  .withMessage('La concentración no puede superar los 50 caracteres');

// ── validadores — Producto ────────────────────────────────────────────────────

const validarParamId = [
  param('id')
    .isInt({ min: 1 }).withMessage('El id debe ser un entero positivo')
    .toInt(),
];

const validarParamIdProducto = [
  param('id_producto')
    .isInt({ min: 1 }).withMessage('El id_producto debe ser un entero positivo')
    .toInt(),
];

const validarCreacionProducto = [
  body('codigo')
    .trim()
    .notEmpty().withMessage('El código es requerido')
    .isLength({ max: 50 }).withMessage('El código no puede superar los 50 caracteres'),

  body('nombre_comercial')
    .trim()
    .notEmpty().withMessage('El nombre comercial es requerido')
    .isLength({ max: 150 }).withMessage('El nombre comercial no puede superar los 150 caracteres'),

  body('nombre_generico')
    .trim()
    .notEmpty().withMessage('El nombre genérico es requerido')
    .isLength({ max: 150 }).withMessage('El nombre genérico no puede superar los 150 caracteres'),

  validarConcentracionOpcional(),

  body('id_presentacion')
    .isInt({ min: 1 }).withMessage('id_presentacion debe ser un entero positivo')
    .toInt(),

  body('descripcion')
    .optional({ nullable: true })
    .trim(),

  body('id_categoria')
    .isInt({ min: 1 }).withMessage('id_categoria debe ser un entero positivo')
    .toInt(),

  body('id_casa')
    .isInt({ min: 1 }).withMessage('id_casa debe ser un entero positivo')
    .toInt(),

  body('id_proveedor')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('id_proveedor debe ser un entero positivo')
    .toInt(),

  body('precio_compra')
    .isFloat({ min: 0 }).withMessage('El precio de compra debe ser mayor o igual a 0')
    .toFloat(),

  body('stock_minimo')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser mayor o igual a 0')
    .toInt(),

  body('meses_alerta_vencimiento')
    .isInt({ min: 1 }).withMessage('Los meses de alerta deben ser mayor a 0')
    .toInt(),

  body('aplica_mayoreo')
    .optional()
    .isBoolean().withMessage('aplica_mayoreo debe ser un booleano')
    .toBoolean(),
];

const validarActualizacionProducto = [
  body('codigo')
    .optional()
    .trim()
    .notEmpty().withMessage('El código no puede estar vacío')
    .isLength({ max: 50 }).withMessage('El código no puede superar los 50 caracteres'),

  body('nombre_comercial')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre comercial no puede estar vacío')
    .isLength({ max: 150 }).withMessage('El nombre comercial no puede superar los 150 caracteres'),

  body('nombre_generico')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre genérico no puede estar vacío')
    .isLength({ max: 150 }).withMessage('El nombre genérico no puede superar los 150 caracteres'),

  validarConcentracionOpcional(),

  body('id_presentacion')
    .optional()
    .isInt({ min: 1 }).withMessage('id_presentacion debe ser un entero positivo')
    .toInt(),
  body('descripcion')
    .optional({ nullable: true })
    .trim(),

  body('id_categoria')
    .optional()
    .isInt({ min: 1 }).withMessage('id_categoria debe ser un entero positivo')
    .toInt(),

  body('id_casa')
    .optional()
    .isInt({ min: 1 }).withMessage('id_casa debe ser un entero positivo')
    .toInt(),

  body('id_proveedor')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('id_proveedor debe ser un entero positivo')
    .toInt(),

  body('precio_compra')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio de compra debe ser mayor o igual a 0')
    .toFloat(),

  body('stock_minimo')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser mayor o igual a 0')
    .toInt(),

  body('meses_alerta_vencimiento')
    .optional()
    .isInt({ min: 1 }).withMessage('Los meses de alerta deben ser mayor a 0')
    .toInt(),

  body('aplica_mayoreo')
    .optional()
    .isBoolean().withMessage('aplica_mayoreo debe ser un booleano')
    .toBoolean(),
];

const validarCambioEstado = [
  body('activo')
    .isBoolean().withMessage('El campo "activo" debe ser un booleano')
    .toBoolean(),
];

const validarCambioMayoreo = [
  body('aplica_mayoreo')
    .isBoolean().withMessage('El campo "aplica_mayoreo" debe ser un booleano')
    .toBoolean(),
];

const validarAutocompletado = [
  query('busqueda')
    .trim()
    .notEmpty().withMessage('busqueda es requerida')
    .isLength({ max: 100 }).withMessage('busqueda no puede superar los 100 caracteres'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('limite debe ser un entero entre 1 y 20')
    .toInt(),
];

// ── validadores — Promocion (anidados) ────────────────────────────────────────

const validarCreacionPromocion = [
  body('id_sucursal')
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo')
    .toInt(),

  body('cantidad_minima')
    .isInt({ min: 1 }).withMessage('La cantidad mínima debe ser mayor a 0')
    .toInt(),

  body('precio_promocion')
    .isFloat({ min: 0.01 }).withMessage('El precio de promoción debe ser mayor a 0')
    .toFloat(),

  body('fecha_inicio')
    .isISO8601().withMessage('fecha_inicio debe ser una fecha válida (YYYY-MM-DD)')
    .toDate(),

  body('fecha_fin')
    .isISO8601().withMessage('fecha_fin debe ser una fecha válida (YYYY-MM-DD)')
    .toDate(),
];

// ── rutas — Producto ──────────────────────────────────────────────────────────

// GET    /api/productos
router.get('/',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  ProductoController.obtenerTodos,
);

// GET /api/productos/autocompletar?busqueda=...&limite=10
// Debe declararse antes de /:id para evitar que Express interprete la ruta como un id.
router.get('/autocompletar',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarAutocompletado,
  ProductoController.autocompletarParaPOS,
);

// GET    /api/productos/:id
router.get('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  ProductoController.obtenerPorId,
);

// POST   /api/productos
router.post('/',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarCreacionProducto,
  ProductoController.crear,
);

// PUT    /api/productos/:id
router.put('/:id',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  validarActualizacionProducto,
  ProductoController.actualizar,
);

// PATCH  /api/productos/:id/mayoreo — solo dependiente (interruptor POS)
router.patch('/:id/mayoreo',
  verificarToken,
  verificarRol('dependiente'),
  validarParamId,
  validarCambioMayoreo,
  ProductoController.cambiarAplicaMayoreo,
);

// PATCH  /api/productos/:id/estado
router.patch('/:id/estado',
  verificarToken,
  verificarRol('dueno', 'administrador', 'dependiente'),
  validarParamId,
  validarCambioEstado,
  ProductoController.cambiarEstado,
);

// ── rutas — Promocion (anidadas bajo producto) ────────────────────────────────

// POST   /api/productos/:id_producto/promociones
router.post('/:id_producto/promociones',
  verificarToken,
  verificarRol('dependiente'),
  validarParamIdProducto,
  validarCreacionPromocion,
  validateRequest,
  PromocionController.crear,
);

// GET    /api/productos/:id_producto/promociones
router.get('/:id_producto/promociones',
  verificarToken,
  verificarRol('dependiente'),
  validarParamIdProducto,
  validateRequest,
  PromocionController.obtenerPorProducto,
);

module.exports = router;
