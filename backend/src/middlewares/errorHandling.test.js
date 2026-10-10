jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const AppError = require('../errors/AppError');
const asyncHandler = require('./asyncHandler');
const validateRequest = require('./validateRequest');
const notFoundHandler = require('./notFoundHandler');
const errorHandler = require('./errorHandler');

const mockResponse = () => {
  const res = { headersSent: false };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('infraestructura común de errores', () => {
  it('AppError conserva el estado y los detalles del error operacional', () => {
    const details = [{ path: 'nombre', msg: 'nombre es requerido' }];
    const error = new AppError('Datos inválidos.', 400, details);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe(400);
    expect(error.details).toEqual(details);
    expect(error.isOperational).toBe(true);
  });

  it('asyncHandler envía los rechazos al siguiente middleware', async () => {
    const error = new Error('Fallo asíncrono');
    const next = jest.fn();
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('validateRequest continúa cuando la solicitud es válida', () => {
    validationResult.mockReturnValue({ isEmpty: () => true });
    const next = jest.fn();

    validateRequest({}, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('validateRequest convierte los errores de validación en AppError', () => {
    const details = [{ path: 'nombre', msg: 'nombre es requerido' }];
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => details,
    });
    const next = jest.fn();

    validateRequest({}, {}, next);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });

  it('notFoundHandler crea una respuesta controlada para rutas inexistentes', () => {
    const next = jest.fn();

    notFoundHandler({}, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Ruta no encontrada.',
      statusCode: 404,
    }));
  });

  it('errorHandler responde con el mensaje y los detalles controlados', () => {
    const res = mockResponse();
    const details = [{ path: 'nombre', msg: 'nombre es requerido' }];

    errorHandler(new AppError('Datos inválidos.', 400, details), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Datos inválidos.',
      errores: details,
    });
  });

  it('errorHandler oculta el detalle de los errores inesperados', () => {
    const res = mockResponse();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('Conexión rechazada por PostgreSQL'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Error interno del servidor.',
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
