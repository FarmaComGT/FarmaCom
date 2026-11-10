jest.mock('../daos/UsuarioDAO');
jest.mock('../daos/LaboratorioDAO');
jest.mock('bcrypt');

const bcrypt = require('bcrypt');
const UsuarioDAO = require('../daos/UsuarioDAO');
const LaboratorioDAO = require('../daos/LaboratorioDAO');
const UsuarioService = require('./UsuarioService');

const actorDueno = { id_usuario: 90, id_sucursal: 1, rol: 'dueno' };
const mockClient = {};

describe('UsuarioService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    UsuarioDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion(mockClient));
    UsuarioDAO.obtenerParaActualizar.mockImplementation((id) => UsuarioDAO.obtenerPorId(id));
  });
  describe('crearUsuario', () => {
    it.each(['123456', 'passwordpassword', 'FarmaCom123456789'])('impide guardar una clave débil al crear: %s', async (contrasena) => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue(null);
      await expect(UsuarioService.crearUsuario({ contrasena, rol: 'dependiente' }, actorDueno)).rejects.toMatchObject({ status: 400 });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(UsuarioDAO.crear).not.toHaveBeenCalled();
    });
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
        contrasena: 'roble nube faro tren',
        rol: 'dependiente',
      }, actorDueno);

      expect(bcrypt.hash).toHaveBeenCalledWith('roble nube faro tren', 10);
      expect(UsuarioDAO.crear).toHaveBeenCalledWith(expect.objectContaining({
        contrasena_hash: 'hash-seguro',
      }));
      expect(resultado).not.toHaveProperty('contrasena_hash');
    });

    it('rechaza con 409 si el correo ya está registrado', async () => {
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ id_usuario: 2 });

      await expect(
        UsuarioService.crearUsuario({ correo_usuario: 'ana@x.com', contrasena: 'x' }, actorDueno),
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
        contrasena: 'roble nube faro tren',
        rol: 'laboratorista',
      }, actorDueno);

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
        contrasena: 'roble nube faro tren',
        rol: 'laboratorista',
      }, actorDueno)).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('obtenerTodos', () => {
    it('nunca expone el hash de la contraseña', async () => {
      UsuarioDAO.obtenerTodos.mockResolvedValue([
        { id_usuario: 1, contrasena_hash: 'x' },
        { id_usuario: 2, contrasena_hash: 'y' },
      ]);

      const resultado = await UsuarioService.obtenerTodos(actorDueno);

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

      const resultado = await UsuarioService.obtenerPorId(1, actorDueno);

      expect(resultado).not.toHaveProperty('contrasena_hash');
    });
  });

  describe('actualizarUsuario', () => {
    it('rechaza con 404 si el usuario no existe', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        UsuarioService.actualizarUsuario(99, { nombre_usuario: 'X' }, actorDueno),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el nuevo correo ya está en uso', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({ id_usuario: 1, correo_usuario: 'a@x.com' });
      UsuarioDAO.obtenerPorCorreo.mockResolvedValue({ id_usuario: 2 });

      await expect(
        UsuarioService.actualizarUsuario(1, { correo_usuario: 'b@x.com' }, actorDueno),
      ).rejects.toMatchObject({ status: 409 });
      expect(UsuarioDAO.actualizar).not.toHaveBeenCalled();
    });

    it('impide que un administrador se asigne el rol de dueño', async () => {
      const actorAdmin = { id_usuario: 7, id_sucursal: 1, rol: 'administrador' };
      UsuarioDAO.obtenerPorId.mockResolvedValue({
        id_usuario: 7, id_sucursal: 1, rol: 'administrador', estado_usuario: 'activo',
      });

      await expect(
        UsuarioService.actualizarUsuario(7, { rol: 'dueno' }, actorAdmin),
      ).rejects.toMatchObject({ status: 403 });
      expect(UsuarioDAO.actualizar).not.toHaveBeenCalled();
    });

    it('impide que un administrador modifique cuentas de otra sucursal', async () => {
      const actorAdmin = { id_usuario: 7, id_sucursal: 1, rol: 'administrador' };
      UsuarioDAO.obtenerPorId.mockResolvedValue({
        id_usuario: 8, id_sucursal: 2, rol: 'dependiente', estado_usuario: 'activo',
      });

      await expect(
        UsuarioService.actualizarUsuario(8, { nombre_usuario: 'Otro' }, actorAdmin),
      ).rejects.toMatchObject({ status: 403 });
      expect(UsuarioDAO.actualizar).not.toHaveBeenCalled();
    });

    it('impide cambiar el rol del último dueño activo', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({
        id_usuario: 1, id_sucursal: 1, rol: 'dueno', estado_usuario: 'activo',
      });
      UsuarioDAO.contarDuenosActivos.mockResolvedValue(1);

      await expect(
        UsuarioService.actualizarUsuario(1, { rol: 'administrador' }, actorDueno),
      ).rejects.toMatchObject({ status: 409 });
      expect(UsuarioDAO.bloquearProteccionDuenos).toHaveBeenCalledWith(mockClient);
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

      await UsuarioService.actualizarUsuario(1, { rol: 'dependiente' }, actorDueno);

      expect(UsuarioDAO.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({
        rol: 'dependiente',
        id_laboratorio: null,
      }), mockClient);
    });
  });

  describe('cambiarContrasena', () => {
    it.each(['123456', 'passwordpassword', 'FarmaCom123456789'])('impide guardar una clave débil al restablecer: %s', async (clave) => {
      await expect(UsuarioService.cambiarContrasena(1, 'clave-dueno', clave, actorDueno)).rejects.toMatchObject({ status: 400 });
      expect(UsuarioDAO.actualizarContrasena).not.toHaveBeenCalled();
      expect(UsuarioDAO.incrementarTokenVersion).not.toHaveBeenCalled();
    });
    const dueno = { ...actorDueno, estado_usuario: 'activo', contrasena_hash: 'hash-dueno' };
    beforeEach(() => {
      UsuarioDAO.obtenerPorId.mockImplementation(async (id) => id === 90 ? dueno : { id_usuario: id, contrasena_hash: 'hash-usuario' });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hash-nuevo');
    });
    it.each(['administrador', 'dependiente', 'laboratorista'])('rechaza al rol %s incluso en su propia cuenta', async (rol) => {
      await expect(UsuarioService.cambiarContrasena(90, 'actual', 'nueva', { ...actorDueno, rol })).rejects.toMatchObject({ status: 403 });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
    it('verifica la clave del dueño y actualiza la cuenta objetivo en una transacción', async () => {
      const resultado = await UsuarioService.cambiarContrasena(1, 'clave-dueno', 'luna bosque rio cobre', actorDueno);
      expect(bcrypt.compare).toHaveBeenCalledWith('clave-dueno', 'hash-dueno');
      expect(UsuarioDAO.actualizarContrasena).toHaveBeenCalledWith(1, 'hash-nuevo', mockClient);
      expect(UsuarioDAO.incrementarTokenVersion).toHaveBeenCalledWith(1, mockClient);
      expect(resultado).toEqual({ mensaje: 'Contraseña restablecida correctamente.' });
    });
    it('rechaza la confirmación incorrecta sin modificar la cuenta', async () => {
      bcrypt.compare.mockResolvedValue(false);
      await expect(UsuarioService.cambiarContrasena(1, 'mala', 'luna bosque rio cobre', actorDueno)).rejects.toMatchObject({ status: 403 });
      expect(UsuarioDAO.actualizarContrasena).not.toHaveBeenCalled();
      expect(UsuarioDAO.incrementarTokenVersion).not.toHaveBeenCalled();
    });
    it('rechaza una cuenta objetivo inexistente', async () => {
      UsuarioDAO.obtenerParaActualizar.mockResolvedValue(null);
      await expect(UsuarioService.cambiarContrasena(99, 'actual', 'luna bosque rio cobre', actorDueno)).rejects.toMatchObject({ status: 404 });
      expect(UsuarioDAO.actualizarContrasena).not.toHaveBeenCalled();
    });
    it('permite que el due?o cambie su propia contrase?a', async () => {
      await UsuarioService.cambiarContrasena(90, 'actual', 'luna bosque rio cobre', actorDueno);
      expect(UsuarioDAO.incrementarTokenVersion).toHaveBeenCalledWith(90, mockClient);
    });
  });

  describe('cambiarEstado', () => {
    it('rechaza con 404 si el usuario no existe', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue(null);

      await expect(UsuarioService.cambiarEstado(99, 'inactivo', actorDueno)).rejects.toMatchObject({ status: 404 });
    });

    it('impide desactivar al último dueño activo', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({
        id_usuario: 1, rol: 'dueno', estado_usuario: 'activo',
      });
      UsuarioDAO.contarDuenosActivos.mockResolvedValue(1);

      await expect(
        UsuarioService.cambiarEstado(1, 'inactivo', actorDueno),
      ).rejects.toMatchObject({ status: 409 });
      expect(UsuarioDAO.cambiarEstado).not.toHaveBeenCalled();
    });
  });

  describe('eliminarUsuario', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      UsuarioDAO.eliminar.mockResolvedValue(null);

      await expect(UsuarioService.eliminarUsuario(99, actorDueno)).rejects.toMatchObject({ status: 404 });
    });

    it('impide eliminar al último dueño activo', async () => {
      UsuarioDAO.obtenerPorId.mockResolvedValue({
        id_usuario: 1, rol: 'dueno', estado_usuario: 'activo',
      });
      UsuarioDAO.contarDuenosActivos.mockResolvedValue(1);

      await expect(
        UsuarioService.eliminarUsuario(1, actorDueno),
      ).rejects.toMatchObject({ status: 409 });
      expect(UsuarioDAO.eliminar).not.toHaveBeenCalled();
    });
  });
});
