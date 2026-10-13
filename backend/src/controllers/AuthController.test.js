jest.mock('../services/AuthService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const authService = require('../services/AuthService');
const { COOKIE_NAME } = require('../config/auth');
const AuthController = require('./AuthController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('AuthController', () => {
  describe('login', () => {
    it('responde 200, guarda la cookie httpOnly y no expone el token en el body', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      authService.login.mockResolvedValue({
        token: 'jwt-falso',
        usuario: { id_usuario: 1, rol: 'dependiente' },
      });

      const req = { body: { correo_usuario: 'ana@x.com', contrasena: 'clave123' } };
      const res = mockResponse();

      await AuthController.login(req, res);

      expect(authService.login).toHaveBeenCalledWith('ana@x.com', 'clave123');
      expect(res.cookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        'jwt-falso',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ usuario: { id_usuario: 1, rol: 'dependiente' } });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('responde 401 con credenciales inválidas sin establecer cookie', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Credenciales inválidas');
      error.status = 401;
      authService.login.mockRejectedValue(error);

      const req = { body: { correo_usuario: 'ana@x.com', contrasena: 'mala' } };
      const res = mockResponse();

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('limpia la cookie y responde con el resultado del service', async () => {
      authService.logout.mockResolvedValue({ mensaje: 'Sesión cerrada correctamente' });

      const req = { cookies: { [COOKIE_NAME]: 'jwt-falso' } };
      const res = mockResponse();

      await AuthController.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith('jwt-falso');
      expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('me', () => {
    it('responde 200 con el usuario de la sesión actual', async () => {
      authService.obtenerSesionActual.mockResolvedValue({ id_usuario: 1, rol: 'dependiente' });

      const req = { usuario: { id_usuario: 1 } };
      const res = mockResponse();

      await AuthController.me(req, res);

      expect(authService.obtenerSesionActual).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ usuario: { id_usuario: 1, rol: 'dependiente' } });
    });

    it('responde 404 cuando el usuario de la sesión ya no existe', async () => {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      authService.obtenerSesionActual.mockRejectedValue(error);

      const req = { usuario: { id_usuario: 99 } };
      const res = mockResponse();

      await AuthController.me(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
