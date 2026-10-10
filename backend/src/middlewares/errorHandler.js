const AppError = require('../errors/AppError');

const obtenerStatusCode = (error) => {
  const statusCode = error.statusCode || error.status;

  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
    return statusCode;
  }

  return 500;
};

const errorHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = obtenerStatusCode(error);
  const isOperational = error instanceof AppError || statusCode < 500;
  const response = {
    mensaje: isOperational ? error.message : 'Error interno del servidor.',
  };

  if (isOperational && Array.isArray(error.details) && error.details.length > 0) {
    response.errores = error.details;
  }

  if (!isOperational) {
    console.error(error);
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
