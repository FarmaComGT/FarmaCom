jest.mock('../database/db');

const pool = require('../database/db');
const UsuarioDAO = require('./UsuarioDAO');

describe('UsuarioDAO', () => {
  it('crea un usuario', async () => {
    const fila = { id_usuario: 1, nombre_usuario: 'Ana' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(UsuarioDAO.crear({
      id_sucursal: 1,
      nombre_usuario: 'Ana',
      correo_usuario: 'ana@x.com',
      contrasena_hash: 'hash',
      rol: 'dependiente',
    })).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 'Ana', 'ana@x.com', 'hash', 'dependiente']);
  });

  it('obtiene todos los usuarios', async () => {
    const filas = [{ id_usuario: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(UsuarioDAO.obtenerTodos()).resolves.toEqual(filas);
  });

  it('devuelve null cuando no encuentra el usuario por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(UsuarioDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('busca un usuario por correo', async () => {
    const fila = { id_usuario: 1, correo_usuario: 'ana@x.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(UsuarioDAO.obtenerPorCorreo('ana@x.com')).resolves.toEqual(fila);
  });

  it('obtiene los usuarios de una sucursal', async () => {
    const filas = [{ id_usuario: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(UsuarioDAO.obtenerPorSucursal(1)).resolves.toEqual(filas);
  });

  it('actualiza los campos del usuario', async () => {
    const fila = { id_usuario: 1, nombre_usuario: 'Ana 2' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      UsuarioDAO.actualizar(1, { nombre_usuario: 'Ana 2' }),
    ).resolves.toEqual(fila);
  });

  it('actualiza la contraseña', async () => {
    const fila = { id_usuario: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(UsuarioDAO.actualizarContrasena(1, 'nuevo-hash')).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['nuevo-hash', 1]);
  });

  it('incrementa el token_version', async () => {
    const fila = { id_usuario: 1, token_version: 2 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(UsuarioDAO.incrementarTokenVersion(1)).resolves.toEqual(fila);
  });

  it('cambia el estado del usuario', async () => {
    const fila = { id_usuario: 1, estado_usuario: 'inactivo' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(UsuarioDAO.cambiarEstado(1, 'inactivo')).resolves.toEqual(fila);
  });

  it('elimina un usuario', async () => {
    const fila = { id_usuario: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(UsuarioDAO.eliminar(1)).resolves.toEqual(fila);
  });
});
