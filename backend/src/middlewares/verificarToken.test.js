jest.mock('jsonwebtoken');
jest.mock('../daos/UsuarioDAO');

const jwt = require('jsonwebtoken');
const UsuarioDAO = require('../daos/UsuarioDAO');
const verificarToken = require('./verificarToken');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('verificarToken', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('responde 401 si no hay cookie de sesión', async () => {
    const req = { cookies: {} };
    const res = mockResponse();
    const next = jest.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 si el token no es válido o expiró', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

    const req = { cookies: { auth_token: 'token-malo' } };
    const res = mockResponse();
    const next = jest.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 si el usuario del token ya no existe', async () => {
    jwt.verify.mockReturnValue({ id_usuario: 99, token_version: 0 });
    UsuarioDAO.obtenerPorId.mockResolvedValue(null);

    const req = { cookies: { auth_token: 'token-valido' } };
    const res = mockResponse();
    const next = jest.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 403 si la cuenta del usuario está inactiva', async () => {
    jwt.verify.mockReturnValue({ id_usuario: 1, token_version: 0 });
    UsuarioDAO.obtenerPorId.mockResolvedValue({ id_usuario: 1, estado_usuario: 'inactivo', token_version: 0 });

    const req = { cookies: { auth_token: 'token-valido' } };
    const res = mockResponse();
    const next = jest.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 si el token_version ya no coincide (sesión invalidada)', async () => {
    jwt.verify.mockReturnValue({ id_usuario: 1, token_version: 1 });
    UsuarioDAO.obtenerPorId.mockResolvedValue({ id_usuario: 1, estado_usuario: 'activo', token_version: 2 });

    const req = { cookies: { auth_token: 'token-viejo' } };
    const res = mockResponse();
    const next = jest.fn();

    await verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('llama a next() y adjunta el usuario autenticado cuando todo es válido', async () => {
    jwt.verify.mockReturnValue({ id_usuario: 1, token_version: 0 });
    UsuarioDAO.obtenerPorId.mockResolvedValue({
      id_usuario: 1, id_sucursal: 2, id_laboratorio: null,
      rol: 'dependiente', estado_usuario: 'activo', token_version: 0,
    });

    const req = { cookies: { auth_token: 'token-valido' } };
    const res = mockResponse();
    const next = jest.fn();

    await verificarToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.usuario).toEqual({
      id_usuario: 1, id_sucursal: 2, id_laboratorio: null,
      rol: 'dependiente', token_version: 0,
    });
    expect(res.status).not.toHaveBeenCalled();
  });
});
