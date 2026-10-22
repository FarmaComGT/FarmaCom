const AppError = require('../errors/AppError');

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

module.exports = { lanzarError };
