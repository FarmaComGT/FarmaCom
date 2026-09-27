jest.mock('../database/db');

const pool = require('../database/db');
const SucursalDAO = require('./SucursalDAO');

describe('SucursalDAO', () => {
  it('crea una sucursal', async () => {
    const fila = { id_sucursal: 1, id_ciudad: 1, nombre_sucursal: 'Central', direccion: 'Zona 1' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      SucursalDAO.crear({ id_ciudad: 1, nombre_sucursal: 'Central', direccion: 'Zona 1' }),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 'Central', 'Zona 1']);
  });

  it('obtiene todas las sucursales ordenadas por id', async () => {
    const filas = [{ id_sucursal: 1 }, { id_sucursal: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(SucursalDAO.obtenerTodos()).resolves.toEqual(filas);
  });

  it('devuelve null cuando no encuentra la sucursal por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(SucursalDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('busca una sucursal por nombre sin distinguir mayúsculas', async () => {
    const fila = { id_sucursal: 1, nombre_sucursal: 'Central' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(SucursalDAO.obtenerPorNombre('central')).resolves.toEqual(fila);
  });

  it('actualiza los campos enviados', async () => {
    const fila = { id_sucursal: 1, nombre_sucursal: 'Central 2' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      SucursalDAO.actualizar(1, { id_ciudad: null, nombre_sucursal: 'Central 2', direccion: null }),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [null, 'Central 2', null, 1]);
  });

  it('elimina una sucursal', async () => {
    const fila = { id_sucursal: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(SucursalDAO.eliminar(1)).resolves.toEqual(fila);
  });
});
