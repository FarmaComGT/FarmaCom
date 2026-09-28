jest.mock('../database/db');

const pool = require('../database/db');
const CorreoSucursalDAO = require('./CorreoSucursalDAO');

describe('CorreoSucursalDAO', () => {
  it('crea un correo para una sucursal', async () => {
    const fila = { id_correo_sucursal: 1, id_sucursal: 1, correo: 'a@b.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      CorreoSucursalDAO.crear({ id_sucursal: 1, correo: 'a@b.com' }),
    ).resolves.toEqual(fila);
  });

  it('obtiene todos los correos ordenados por id', async () => {
    const filas = [{ id_correo_sucursal: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CorreoSucursalDAO.obtenerTodos()).resolves.toEqual(filas);
  });

  it('devuelve null si el correo no existe por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(CorreoSucursalDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('obtiene los correos de una sucursal', async () => {
    const filas = [{ id_correo_sucursal: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CorreoSucursalDAO.obtenerPorSucursal(1)).resolves.toEqual(filas);
  });

  it('busca un correo exacto', async () => {
    const fila = { id_correo_sucursal: 1, correo: 'a@b.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CorreoSucursalDAO.obtenerPorCorreo('a@b.com')).resolves.toEqual(fila);
  });

  it('actualiza el correo', async () => {
    const fila = { id_correo_sucursal: 1, correo: 'nuevo@b.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      CorreoSucursalDAO.actualizar(1, { correo: 'nuevo@b.com' }),
    ).resolves.toEqual(fila);
  });

  it('elimina un correo por id', async () => {
    const fila = { id_correo_sucursal: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CorreoSucursalDAO.eliminar(1)).resolves.toEqual(fila);
  });

  it('elimina todos los correos de una sucursal', async () => {
    const filas = [{ id_correo_sucursal: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CorreoSucursalDAO.eliminarPorSucursal(1)).resolves.toEqual(filas);
  });
});
