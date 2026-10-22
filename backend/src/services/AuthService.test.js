jest.mock('../daos/UsuarioDAO');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UsuarioDAO = require('../daos/UsuarioDAO');
const AuthService = require('./AuthService');

const usuarioActivo = {
  id_usuario: 1,
  nombre_usuario: 'jperez',
  correo_usuario: 'jperez@farmacom.com',
  contrasena_hash: 'hash-guardado',
  estado_usuario: 'activo',
  rol: 'vendedor',
  id_sucursal: 2,
  token_version: 0,
};

describe('AuthService', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'secreto-de-pruebas';
  });

  describe('login', () => {
    it('devuelve token y datos de sesión con credenciales válidas', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(usuarioActivo);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token-firmado');

      const resultado = await AuthService.login('jperez@farmacom.com', 'clave123');

      expect(bcrypt.compare).toHaveBeenCalledWith('clave123', 'hash-guardado');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id_usuario: 1, rol: 'vendedor' }),
        'secreto-de-pruebas',
        expect.any(Object),
      );
      expect(resultado).toEqual({
        token: 'token-firmado',
        usuario: {
          id_usuario: 1,
          nombre_usuario: 'jperez',
          correo_usuario: 'jperez@farmacom.com',
          rol: 'vendedor',
          id_sucursal: 2,
        },
      });
    });

    it('lanza error 401 si el correo no existe', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(null);
      bcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.login('no-existe@farmacom.com', 'clave')).rejects.toMatchObject({
        message: 'Credenciales inválidas',
        status: 401,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'clave',
        expect.stringMatching(/^\$2[aby]\$10\$/),
      );
    });

    it('lanza error 401 si la contraseña es incorrecta', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(usuarioActivo);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        AuthService.login('jperez@farmacom.com', 'clave-incorrecta'),
      ).rejects.toMatchObject({
        message: 'Credenciales inválidas',
        status: 401,
      });
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('responde igual para una cuenta inactiva que para otras credenciales inválidas', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ ...usuarioActivo, estado_usuario: 'inactivo' });
      bcrypt.compare.mockResolvedValue(true);

      await expect(AuthService.login('jperez@farmacom.com', 'clave123')).rejects.toMatchObject({
        message: 'Credenciales inválidas',
        status: 401,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('clave123', 'hash-guardado');
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });
});
