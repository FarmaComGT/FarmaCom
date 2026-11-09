const { body, query } = require('express-validator');
const { validarPaginacion, validarBusqueda } = require('./paginacionValidators');

const nombrePromocion = () => body('nombre').optional({ nullable: true })
  .isString().withMessage('El nombre debe ser texto').bail().trim()
  .isLength({ max: 120 }).withMessage('El nombre no puede superar los 120 caracteres');

const cantidadMaximaPromocion = () => body('cantidad_maxima').optional({ nullable: true })
  .custom((valor) => typeof valor === 'number' || typeof valor === 'string')
  .withMessage('La cantidad máxima debe ser un entero positivo').bail()
  .isInt({ min: 1, max: 2147483647 }).withMessage('La cantidad máxima debe ser un entero positivo').bail().toInt();

const filtrosPromocion = [
  ...validarPaginacion, validarBusqueda(),
  ...['id_producto', 'id_sucursal'].map((campo) => query(campo).optional().isString().bail()
    .isInt({ min: 1, max: 2147483647 }).withMessage(`${campo} inválido`).toInt()),
  query('estado').optional().isString().bail()
    .isIn(['todas', 'vigente', 'programada', 'finalizada', 'desactivada', 'agotada']).withMessage('Estado inválido'),
];

module.exports = { nombrePromocion, cantidadMaximaPromocion, filtrosPromocion };
