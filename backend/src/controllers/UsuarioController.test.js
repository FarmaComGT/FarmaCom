jest.mock('../services/UsuarioService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const usuarioService = require('../services/UsuarioService');
const UsuarioController = require('./UsuarioController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('UsuarioController', () => {
  describe('crear', () => {
    it('responde 201 con el usuario creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      usuarioService.crearUsuario.mockResolvedValue({ id_usuario: 1, nombre_usuario: 'Ana' });

      const req = { body: { nombre_usuario: 'Ana' } };
      const res = mockResponse();

      await UsuarioController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await UsuarioController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuarioService.crearUsuario).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 correo repetido)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('El correo ya está registrado');
      error.status = 409;
      usuarioService.crearUsuario.mockRejectedValue(error);

      const req = { body: { nombre_usuario: 'Ana' } };
      const res = mockResponse();

      await UsuarioController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerTodos', () => {
    it('responde 200 con la lista de usuarios', async () => {
      usuarioService.obtenerTodos.mockResolvedValue([{ id_usuario: 1 }]);
      const res = mockResponse();

      await UsuarioController.obtenerTodos({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 400 cuando el id no es un entero válido', async () => {
      const req = { params: { id: 'abc' }, usuario: { id_usuario: 1, rol: 'dependiente' } };
      const res = mockResponse();

      await UsuarioController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuarioService.obtenerPorId).not.toHaveBeenCalled();
    });

    it('responde 403 si un usuario normal consulta a otro usuario', async () => {
      const req = { params: { id: '2' }, usuario: { id_usuario: 1, rol: 'dependiente' } };
      const res = mockResponse();

      await UsuarioController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(usuarioService.obtenerPorId).not.toHaveBeenCalled();
    });

    it('permite a un usuario consultar su propia información', async () => {
      usuarioService.obtenerPorId.mockResolvedValue({ id_usuario: 1 });

      const req = { params: { id: '1' }, usuario: { id_usuario: 1, rol: 'dependiente' } };
      const res = mockResponse();

      await UsuarioController.obtenerPorId(req, res);

      expect(usuarioService.obtenerPorId).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('permite a un rol elevado (dueno/administrador) consultar a otro usuario', async () => {
      usuarioService.obtenerPorId.mockResolvedValue({ id_usuario: 2 });

      const req = { params: { id: '2' }, usuario: { id_usuario: 1, rol: 'dueno' } };
      const res = mockResponse();

      await UsuarioController.obtenerPorId(req, res);

      expect(usuarioService.obtenerPorId).toHaveBeenCalledWith(2);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorSucursal', () => {
    it('responde 200 con los usuarios de la sucursal', async () => {
      usuarioService.obtenerPorSucursal.mockResolvedValue([{ id_usuario: 1 }]);

      const req = { params: { id_sucursal: '1' } };
      const res = mockResponse();

      await UsuarioController.obtenerPorSucursal(req, res);

      expect(usuarioService.obtenerPorSucursal).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el usuario actualizado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      usuarioService.actualizarUsuario.mockResolvedValue({ id_usuario: 1, nombre_usuario: 'Ana María' });

      const req = { params: { id: '1' }, body: { nombre_usuario: 'Ana María' } };
      const res = mockResponse();

      await UsuarioController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await UsuarioController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuarioService.actualizarUsuario).not.toHaveBeenCalled();
    });
  });

  describe('cambiarContrasena', () => {
    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, usuario: { id_usuario: 1 }, body: {} };
      const res = mockResponse();

      await UsuarioController.cambiarContrasena(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuarioService.cambiarContrasena).not.toHaveBeenCalled();
    });

    it('responde 403 si intenta cambiar la contraseña de otro usuario', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());

      const req = {
        params: { id: '2' },
        usuario: { id_usuario: 1 },
        body: { contrasena_actual: 'a', contrasena_nueva: 'b' },
      };
      const res = mockResponse();

      await UsuarioController.cambiarContrasena(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(usuarioService.cambiarContrasena).not.toHaveBeenCalled();
    });

    it('responde 200 al cambiar la propia contraseña', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      usuarioService.cambiarContrasena.mockResolvedValue({ mensaje: 'Contraseña actualizada correctamente' });

      const req = {
        params: { id: '1' },
        usuario: { id_usuario: 1 },
        body: { contrasena_actual: 'vieja', contrasena_nueva: 'nueva' },
      };
      const res = mockResponse();

      await UsuarioController.cambiarContrasena(req, res);

      expect(usuarioService.cambiarContrasena).toHaveBeenCalledWith(1, 'vieja', 'nueva');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 401 cuando la contraseña actual es incorrecta', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('La contraseña actual es incorrecta');
      error.status = 401;
      usuarioService.cambiarContrasena.mockRejectedValue(error);

      const req = {
        params: { id: '1' },
        usuario: { id_usuario: 1 },
        body: { contrasena_actual: 'mala', contrasena_nueva: 'nueva' },
      };
      const res = mockResponse();

      await UsuarioController.cambiarContrasena(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 con el usuario actualizado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      usuarioService.cambiarEstado.mockResolvedValue({ id_usuario: 1, estado_usuario: 'inactivo' });

      const req = { params: { id: '1' }, body: { estado: 'inactivo' } };
      const res = mockResponse();

      await UsuarioController.cambiarEstado(req, res);

      expect(usuarioService.cambiarEstado).toHaveBeenCalledWith(1, 'inactivo');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await UsuarioController.cambiarEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuarioService.cambiarEstado).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      usuarioService.eliminarUsuario.mockResolvedValue({ mensaje: 'Usuario eliminado correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await UsuarioController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
