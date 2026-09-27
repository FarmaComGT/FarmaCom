jest.mock('../database/db');

const pool = require('../database/db');
const CasaEmailDAO = require('./CasaEmailDAO');

describe('CasaEmailDAO', () => {
  it('crea un correo para una casa', async () => {
    const fila = { id_email: 1, id_casa: 1, correo: 'contacto@bayer.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      CasaEmailDAO.crear({ id_casa: 1, correo: 'contacto@bayer.com' }),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 'contacto@bayer.com']);
  });

  it('obtiene los correos de una casa ordenados por id', async () => {
    const filas = [{ id_email: 1 }, { id_email: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CasaEmailDAO.obtenerPorCasa(1)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY id_email'), [1]);
  });

  it('devuelve null si el correo no existe por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(CasaEmailDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('busca un correo exacto', async () => {
    const fila = { id_email: 1, correo: 'contacto@bayer.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CasaEmailDAO.obtenerPorCorreo('contacto@bayer.com')).resolves.toEqual(fila);
  });

  it('actualiza el correo', async () => {
    const fila = { id_email: 1, correo: 'nuevo@bayer.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      CasaEmailDAO.actualizar(1, { correo: 'nuevo@bayer.com' }),
    ).resolves.toEqual(fila);
  });

  it('elimina un correo por id', async () => {
    const fila = { id_email: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CasaEmailDAO.eliminar(1)).resolves.toEqual(fila);
  });

  it('elimina todos los correos de una casa', async () => {
    const filas = [{ id_email: 1 }, { id_email: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CasaEmailDAO.eliminarPorCasa(1)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id_casa = $1'), [1]);
  });
});
