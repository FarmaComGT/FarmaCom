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
  const isOperational = error instanceof AppError;
  const mensajeSeguro = error.type === 'entity.parse.failed'
    ? 'El cuerpo de la solicitud contiene JSON inválido.'
    : statusCode === 413
      ? 'La solicitud supera el tamaño máximo permitido.'
      : statusCode < 500
        ? 'No se pudo procesar la solicitud.'
        : 'Error interno del servidor.';
  const response = {
    mensaje: isOperational ? error.message : mensajeSeguro,
  };

  if (isOperational && Array.isArray(error.details) && error.details.length > 0) {
    response.errores = error.details;
  }

  if (!isOperational && statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
