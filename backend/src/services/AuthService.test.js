jest.mock('../daos/UsuarioDAO');
jest.mock('../daos/CajaDAO');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UsuarioDAO = require('../daos/UsuarioDAO');
const CajaDAO = require('../daos/CajaDAO');
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

  describe('logout', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jwt.verify.mockReturnValue({ id_usuario: 1, token_version: 0 });
      UsuarioDAO.obtenerPorId.mockResolvedValue(usuarioActivo);
      CajaDAO.obtenerSesionesAbiertasPorUsuario.mockResolvedValue([]);
    });

    it('invalida el token cuando el usuario no tiene turnos de caja abiertos', async () => {
      await expect(AuthService.logout('token')).resolves.toEqual({ mensaje: 'Sesión cerrada correctamente' });

      expect(CajaDAO.obtenerSesionesAbiertasPorUsuario).toHaveBeenCalledWith(1);
      expect(UsuarioDAO.incrementarTokenVersion).toHaveBeenCalledWith(1);
    });

    it('rechaza con 409 y conserva la sesión si hay un turno de caja abierto', async () => {
      CajaDAO.obtenerSesionesAbiertasPorUsuario.mockResolvedValue([
        { id_sesion_caja: 3, nombre_caja: 'Caja principal', nombre_sucursal: 'Sucursal Central' },
      ]);

      await expect(AuthService.logout('token')).rejects.toMatchObject({
        status: 409,
        message: 'No puedes cerrar sesión con un turno de caja abierto (Caja principal/Sucursal Central). Dirígete a Caja › Operación para cerrar el turno actual.',
      });
      expect(UsuarioDAO.incrementarTokenVersion).not.toHaveBeenCalled();
    });

    it('enumera todas las cajas cuando hay varios turnos abiertos', async () => {
      CajaDAO.obtenerSesionesAbiertasPorUsuario.mockResolvedValue([
        { nombre_caja: 'Caja 1', nombre_sucursal: 'Central' },
        { nombre_caja: 'Caja 2', nombre_sucursal: 'Central' },
      ]);

      await expect(AuthService.logout('token')).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('turnos de caja abiertos (Caja 1/Central, Caja 2/Central)'),
      });
    });

    it('no consulta cajas ni falla con un token expirado o inválido', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(AuthService.logout('token-vencido')).resolves.toEqual({ mensaje: 'Sesión cerrada correctamente' });
      expect(CajaDAO.obtenerSesionesAbiertasPorUsuario).not.toHaveBeenCalled();
      expect(UsuarioDAO.incrementarTokenVersion).not.toHaveBeenCalled();
    });

    it('no bloquea una sesión ya invalidada por versión de token', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({ ...usuarioActivo, token_version: 2 });

      await expect(AuthService.logout('token')).resolves.toEqual({ mensaje: 'Sesión cerrada correctamente' });
      expect(CajaDAO.obtenerSesionesAbiertasPorUsuario).not.toHaveBeenCalled();
    });
  });
});
