const { validationResult } = require('express-validator');
const AppError = require('../errors/AppError');

const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return next(new AppError(
    'La solicitud contiene datos inválidos.',
    400,
    errors.array(),
  ));
};

module.exports = validateRequest;
