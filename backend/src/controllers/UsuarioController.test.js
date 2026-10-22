jest.mock('../services/UsuarioService');

const usuarioService = require('../services/UsuarioService');
const AppError = require('../errors/AppError');
const UsuarioController = require('./UsuarioController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('UsuarioController', () => {
  it('crea y lista usuarios', async () => {
    usuarioService.crearUsuario.mockResolvedValue({ id_usuario: 1 });
    usuarioService.obtenerTodos.mockResolvedValue([{ id_usuario: 1 }]);
    const res = mockResponse();

    await UsuarioController.crear({ body: { nombre_usuario: 'Ana' } }, res, jest.fn());
    await UsuarioController.obtenerTodos({}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('permite consultar la propia cuenta', async () => {
    usuarioService.obtenerPorId.mockResolvedValue({ id_usuario: 1 });
    const res = mockResponse();

    await UsuarioController.obtenerPorId(
      { params: { id: '1' }, usuario: { id_usuario: 1, rol: 'dependiente' } },
      res,
      jest.fn(),
    );

    expect(usuarioService.obtenerPorId).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('delega la prohibición de consultar otra cuenta', async () => {
    const res = mockResponse();
    const next = jest.fn();

    await UsuarioController.obtenerPorId(
      { params: { id: '2' }, usuario: { id_usuario: 1, rol: 'dependiente' } },
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
    expect(usuarioService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('lista usuarios por sucursal', async () => {
    usuarioService.obtenerPorSucursal.mockResolvedValue([]);
    const res = mockResponse();

    await UsuarioController.obtenerPorSucursal({ params: { id_sucursal: '3' } }, res, jest.fn());

    expect(usuarioService.obtenerPorSucursal).toHaveBeenCalledWith(3);
  });

  it('actualiza un usuario', async () => {
    usuarioService.actualizarUsuario.mockResolvedValue({ id_usuario: 1 });
    const res = mockResponse();

    await UsuarioController.actualizar(
      { params: { id: '1' }, body: { nombre_usuario: 'Ana María' } },
      res,
      jest.fn(),
    );

    expect(usuarioService.actualizarUsuario).toHaveBeenCalledWith(1, { nombre_usuario: 'Ana María' });
  });

  it('cambia la contraseña propia', async () => {
    usuarioService.cambiarContrasena.mockResolvedValue({ mensaje: 'Contraseña actualizada' });
    const req = {
      params: { id: '1' },
      usuario: { id_usuario: 1 },
      body: { contrasena_actual: 'vieja', contrasena_nueva: 'nueva' },
    };
    const res = mockResponse();

    await UsuarioController.cambiarContrasena(req, res, jest.fn());

    expect(usuarioService.cambiarContrasena).toHaveBeenCalledWith(1, 'vieja', 'nueva');
  });

  it('delega la prohibición de cambiar la contraseña ajena', async () => {
    const req = {
      params: { id: '2' },
      usuario: { id_usuario: 1 },
      body: { contrasena_actual: 'vieja', contrasena_nueva: 'nueva' },
    };
    const next = jest.fn();

    await UsuarioController.cambiarContrasena(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });

  it('cambia el estado y elimina usuarios', async () => {
    usuarioService.cambiarEstado.mockResolvedValue({ id_usuario: 1, estado: 'inactivo' });
    usuarioService.eliminarUsuario.mockResolvedValue({ mensaje: 'Usuario eliminado correctamente' });
    const res = mockResponse();

    await UsuarioController.cambiarEstado(
      { params: { id: '1' }, body: { estado: 'inactivo' } },
      res,
      jest.fn(),
    );
    await UsuarioController.eliminar({ params: { id: '1' } }, res, jest.fn());

    expect(usuarioService.cambiarEstado).toHaveBeenCalledWith(1, 'inactivo');
    expect(usuarioService.eliminarUsuario).toHaveBeenCalledWith(1);
  });

  it('delega los errores del servicio al middleware', async () => {
    const error = new Error('fallo inesperado');
    usuarioService.crearUsuario.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await UsuarioController.crear({ body: {} }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
