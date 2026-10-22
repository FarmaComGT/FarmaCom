jest.mock('../services/AuthService');

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

describe('AuthController', () => {
  it('inicia sesión, guarda la cookie httpOnly y no expone el token', async () => {
    authService.login.mockResolvedValue({
      token: 'jwt-falso',
      usuario: { id_usuario: 1, rol: 'dependiente' },
    });
    const req = { body: { correo_usuario: 'ana@x.com', contrasena: 'clave123' } };
    const res = mockResponse();

    await AuthController.login(req, res, jest.fn());

    expect(authService.login).toHaveBeenCalledWith('ana@x.com', 'clave123');
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      'jwt-falso',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ usuario: { id_usuario: 1, rol: 'dependiente' } });
  });

  it('delega los errores de login al middleware', async () => {
    const error = new Error('Credenciales inválidas');
    authService.login.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await AuthController.login({ body: {} }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('cierra la sesión y limpia la cookie', async () => {
    authService.logout.mockResolvedValue({ mensaje: 'Sesión cerrada correctamente' });
    const req = { cookies: { [COOKIE_NAME]: 'jwt-falso' } };
    const res = mockResponse();

    await AuthController.logout(req, res, jest.fn());

    expect(authService.logout).toHaveBeenCalledWith('jwt-falso');
    expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('devuelve la sesión actual', async () => {
    authService.obtenerSesionActual.mockResolvedValue({ id_usuario: 1 });
    const res = mockResponse();

    await AuthController.me({ usuario: { id_usuario: 1 } }, res, jest.fn());

    expect(authService.obtenerSesionActual).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ usuario: { id_usuario: 1 } });
  });
});
