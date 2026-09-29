jest.mock('../daos/UsuarioDAO');
jest.mock('../daos/LaboratorioDAO');
jest.mock('bcrypt');

const bcrypt = require('bcrypt');
const UsuarioDAO = require('../daos/UsuarioDAO');
const LaboratorioDAO = require('../daos/LaboratorioDAO');
const UsuarioService = require('./UsuarioService');

describe('UsuarioService', () => {
  describe('crearUsuario', () => {
    it('crea el usuario hasheando la contraseña y sin devolver el hash', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hash-seguro');
      UsuarioDAO.crear.mockResolvedValue({
        id_usuario: 1,
        nombre_usuario: 'Ana',
        contrasena_hash: 'hash-seguro',
      });

      const resultado = await UsuarioService.crearUsuario({
        id_sucursal: 1,
        nombre_usuario: 'Ana',
        correo_usuario: 'ana@x.com',
        contrasena: 'clave123',
        rol: 'dependiente',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('clave123', 10);
      expect(UsuarioDAO.crear).toHaveBeenCalledWith(expect.objectContaining({
        contrasena_hash: 'hash-seguro',
      }));
      expect(resultado).not.toHaveProperty('contrasena_hash');
    });

    it('rechaza con 409 si el correo ya está registrado', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ id_usuario: 2 });

      await expect(
        UsuarioService.crearUsuario({ correo_usuario: 'ana@x.com', contrasena: 'x' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(UsuarioDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('asignacion de laboratorio', () => {
    it('asigna un laboratorio activo al crear un laboratorista', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(null);
      LaboratorioDAO.obtenerPorId.mockResolvedValue({ id_laboratorio: 3, activo: true });
      bcrypt.hash.mockResolvedValue('hash-seguro');
      UsuarioDAO.crear.mockResolvedValue({ id_usuario: 3, contrasena_hash: 'hash-seguro' });

      await UsuarioService.crearUsuario({
        id_sucursal: 1,
        id_laboratorio: 3,
        nombre_usuario: 'Laura',
        correo_usuario: 'laura@x.com',
        contrasena: 'clave123',
        rol: 'laboratorista',
      });

      expect(UsuarioDAO.crear).toHaveBeenCalledWith(expect.objectContaining({
        rol: 'laboratorista',
        id_laboratorio: 3,
      }));
    });

    it('rechaza un laboratorista sin laboratorio asignado', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(null);

      await expect(UsuarioService.crearUsuario({
        id_sucursal: 1,
        nombre_usuario: 'Laura',
        correo_usuario: 'laura@x.com',
        contrasena: 'clave123',
        rol: 'laboratorista',
      })).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('obtenerTodos', () => {
    it('nunca expone el hash de la contraseña', async () => {
      UsuarioDAO.obtenerTodos.mockResolvedValue([
        { id_usuario: 1, contrasena_hash: 'x' },
        { id_usuario: 2, contrasena_hash: 'y' },
      ]);

      const resultado = await UsuarioService.obtenerTodos();

      expect(resultado.every((u) => !('contrasena_hash' in u))).toBe(true);
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 cuando no existe', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue(null);

      await expect(UsuarioService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });

    it('no expone el hash de la contraseña', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({ id_usuario: 1, contrasena_hash: 'x' });

      const resultado = await UsuarioService.obtenerPorId(1);

      expect(resultado).not.toHaveProperty('contrasena_hash');
    });
  });

  describe('actualizarUsuario', () => {
    it('rechaza con 404 si el usuario no existe', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        UsuarioService.actualizarUsuario(99, { nombre_usuario: 'X' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el nuevo correo ya está en uso', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({ id_usuario: 1, correo_usuario: 'a@x.com' });
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ id_usuario: 2 });

      await expect(
        UsuarioService.actualizarUsuario(1, { correo_usuario: 'b@x.com' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(UsuarioDAO.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('actualizar asignacion de laboratorio', () => {
    it('elimina la asignacion al cambiar a un rol de farmacia', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({
        id_usuario: 1,
        correo_usuario: 'laura@x.com',
        rol: 'laboratorista',
        id_laboratorio: 3,
      });
      UsuarioDAO.actualizar.mockResolvedValue({ id_usuario: 1, contrasena_hash: 'hash' });

      await UsuarioService.actualizarUsuario(1, { rol: 'dependiente' });

      expect(UsuarioDAO.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({
        rol: 'dependiente',
        id_laboratorio: null,
      }));
    });
  });

  describe('cambiarContrasena', () => {
    it('rechaza con 404 si el usuario no existe', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        UsuarioService.cambiarContrasena(99, 'actual', 'nueva'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 401 si la contraseña actual no coincide', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({ id_usuario: 1, contrasena_hash: 'hash' });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        UsuarioService.cambiarContrasena(1, 'incorrecta', 'nueva'),
      ).rejects.toMatchObject({ status: 401 });
      expect(UsuarioDAO.actualizarContrasena).not.toHaveBeenCalled();
    });

    it('actualiza la contraseña e incrementa el token_version cuando la actual es correcta', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({ id_usuario: 1, contrasena_hash: 'hash' });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hash-nuevo');

      const resultado = await UsuarioService.cambiarContrasena(1, 'actual', 'nueva');

      expect(UsuarioDAO.actualizarContrasena).toHaveBeenCalledWith(1, 'hash-nuevo');
      expect(UsuarioDAO.incrementarTokenVersion).toHaveBeenCalledWith(1);
      expect(resultado).toEqual({ mensaje: 'Contraseña actualizada correctamente' });
    });
  });

  describe('cambiarEstado', () => {
    it('rechaza con 404 si el usuario no existe', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue(null);

      await expect(UsuarioService.cambiarEstado(99, 'inactivo')).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('eliminarUsuario', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      UsuarioDAO.eliminar.mockResolvedValue(null);

      await expect(UsuarioService.eliminarUsuario(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
