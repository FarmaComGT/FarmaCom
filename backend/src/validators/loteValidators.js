const { body, param } = require('express-validator');

const validarParamId = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarParamIdSucursal = [
  param('id_sucursal').isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo').toInt(),
];

const validarParamIdProducto = [
  param('id_producto').isInt({ min: 1 }).withMessage('id_producto debe ser un entero positivo').toInt(),
];

const validarCreacion = [
  body('id_producto').isInt({ min: 1 }).withMessage('id_producto debe ser un entero positivo').toInt(),
  body('id_proveedor').isInt({ min: 1 }).withMessage('id_proveedor debe ser un entero positivo').toInt(),
  body('id_sucursal').isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo').toInt(),
  body('numero_lote').optional().trim().notEmpty().withMessage('numero_lote no puede estar vacío')
    .isLength({ max: 100 }).withMessage('numero_lote no puede superar los 100 caracteres'),
  body('fecha_vencimiento').optional({ nullable: true }).isISO8601()
    .withMessage('fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD)').toDate(),
  body('cantidad_ingresada').isInt({ min: 1 })
    .withMessage('cantidad_ingresada debe ser un entero mayor a 0').toInt(),
  body('precio_venta').isFloat({ min: 0 }).withMessage('precio_venta debe ser mayor o igual a 0').toFloat(),
  body('precio_compra').isFloat({ min: 0 })
    .withMessage('precio_compra es requerido y debe ser mayor o igual a 0').toFloat(),
  body('margen_ganancia').isFloat({ min: 0, max: 9999.9999 })
    .withMessage('margen_ganancia debe estar entre 0 y 9999.9999').toFloat(),
  body('precio_mayoreo').optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('precio_mayoreo debe ser mayor o igual a 0').toFloat(),
  body('cantidad_mayoreo').optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('cantidad_mayoreo debe ser un entero mayor a 0').toInt(),
];

const validarActualizacion = [
  body('version').exists().withMessage('version es requerida').bail().isInt({ min: 1 })
    .withMessage('version debe ser un entero positivo').toInt(),
  body('id_producto').optional()
    .isInt({ min: 1 }).withMessage('id_producto debe ser un entero positivo').toInt(),
  body('id_proveedor').optional()
    .isInt({ min: 1 }).withMessage('id_proveedor debe ser un entero positivo').toInt(),
  body('id_sucursal').optional()
    .isInt({ min: 1 }).withMessage('id_sucursal debe ser un entero positivo').toInt(),
  body('numero_lote').optional().trim().notEmpty().withMessage('numero_lote no puede estar vacío')
    .isLength({ max: 100 }).withMessage('numero_lote no puede superar los 100 caracteres'),
  body('fecha_vencimiento').optional({ nullable: true }).isISO8601()
    .withMessage('fecha_vencimiento debe ser una fecha válida (YYYY-MM-DD)').toDate(),
  body('precio_venta').optional()
    .isFloat({ min: 0 }).withMessage('precio_venta debe ser mayor o igual a 0').toFloat(),
  body('precio_compra').optional()
    .isFloat({ min: 0 }).withMessage('precio_compra debe ser mayor o igual a 0').toFloat(),
  body('margen_ganancia').optional().isFloat({ min: 0, max: 9999.9999 })
    .withMessage('margen_ganancia debe estar entre 0 y 9999.9999').toFloat(),
  body('precio_mayoreo').optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('precio_mayoreo debe ser mayor o igual a 0').toFloat(),
  body('cantidad_mayoreo').optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('cantidad_mayoreo debe ser un entero mayor a 0').toInt(),
  body('limpiar_mayoreo').optional()
    .isBoolean().withMessage('limpiar_mayoreo debe ser un booleano').toBoolean(),
];

const validarAjusteStock = [
  body('version').isInt({ min: 1 })
    .withMessage('version debe ser un entero positivo').toInt(),
  body('stock_esperado').isInt({ min: 0 })
    .withMessage('stock_esperado debe ser un entero mayor o igual a 0').toInt(),
  body('cantidad_ajuste').isInt().custom((valor) => Number(valor) !== 0)
    .withMessage('cantidad_ajuste debe ser un entero distinto de 0').toInt(),
  body('motivo').trim().notEmpty().withMessage('motivo es requerido')
    .isLength({ max: 500 }).withMessage('motivo no puede superar los 500 caracteres'),
];

module.exports = {
  validarParamId,
  validarParamIdSucursal,
  validarParamIdProducto,
  validarCreacion,
  validarActualizacion,
  validarAjusteStock,
};
