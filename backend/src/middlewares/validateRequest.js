const { validationResult } = require('express-validator');
const AppError = require('../errors/AppError');

// Exponer únicamente metadatos de validación, nunca los valores recibidos.
// También cubre errores agrupados de oneOf y campos desconocidos de checkExact.
const serializarError = (error) => {
  if (Array.isArray(error)) return error.map(serializarError);

  const detalle = {};
  for (const campo of ['type', 'msg', 'path', 'location']) {
    if (typeof error[campo] === 'string') detalle[campo] = error[campo];
  }
  for (const campo of ['nestedErrors', 'fields']) {
    if (Array.isArray(error[campo])) detalle[campo] = error[campo].map(serializarError);
  }
  return detalle;
};

const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return next(new AppError(
    'La solicitud contiene datos inválidos.',
    400,
    errors.array().map(serializarError),
  ));
};

module.exports = validateRequest;
