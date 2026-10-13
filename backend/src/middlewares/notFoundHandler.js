const AppError = require('../errors/AppError');

const notFoundHandler = (_req, _res, next) => {
  next(new AppError('Ruta no encontrada.', 404));
};

module.exports = notFoundHandler;
