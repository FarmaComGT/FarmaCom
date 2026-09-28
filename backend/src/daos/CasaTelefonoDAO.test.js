jest.mock('../database/db');

const pool = require('../database/db');
const CasaTelefonoDAO = require('./CasaTelefonoDAO');

describe('CasaTelefonoDAO', () => {
  it('crea un teléfono para una casa', async () => {
    const fila = { id_telefono: 1, id_casa: 1, numero: '12345678' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      CasaTelefonoDAO.crear({ id_casa: 1, numero: '12345678' }),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, '12345678']);
  });

  it('obtiene los teléfonos de una casa ordenados por id', async () => {
    const filas = [{ id_telefono: 1 }, { id_telefono: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CasaTelefonoDAO.obtenerPorCasa(1)).resolves.toEqual(filas);
  });

  it('devuelve null si el teléfono no existe por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(CasaTelefonoDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('actualiza el número', async () => {
    const fila = { id_telefono: 1, numero: '87654321' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      CasaTelefonoDAO.actualizar(1, { numero: '87654321' }),
    ).resolves.toEqual(fila);
  });

  it('elimina un teléfono por id', async () => {
    const fila = { id_telefono: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CasaTelefonoDAO.eliminar(1)).resolves.toEqual(fila);
  });

  it('elimina todos los teléfonos de una casa', async () => {
    const filas = [{ id_telefono: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CasaTelefonoDAO.eliminarPorCasa(1)).resolves.toEqual(filas);
  });
});
