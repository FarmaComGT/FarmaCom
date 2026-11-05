const { query } = require('express-validator');

const validarPaginacion = [
  query('pagina').optional().isString().bail()
    .isInt({ min: 1, max: 2147483647 }).withMessage('Página inválida').toInt(),
  query('limite').optional().isString().bail()
    .isInt({ min: 1, max: 100 }).withMessage('Límite inválido').toInt(),
];

const validarBusqueda = (max = 150) => query('busqueda')
  .optional().isString().bail().trim()
  .isLength({ max }).withMessage(`busqueda no puede superar los ${max} caracteres`);

const completarPaginacion = (filtros = {}, limitePredeterminado = 25) => {
  if (filtros.pagina === undefined && filtros.limite === undefined) return filtros;
  return {
    ...filtros,
    pagina: filtros.pagina ?? 1,
    limite: filtros.limite ?? limitePredeterminado,
  };
};

module.exports = { validarPaginacion, validarBusqueda, completarPaginacion };
