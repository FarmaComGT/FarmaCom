jest.mock('../database/db');

const pool = require('../database/db');
const CasaFarmaceuticaDAO = require('./CasaFarmaceuticaDAO');

describe('CasaFarmaceuticaDAO', () => {
  it('confirma la transacción cuando la operación termina correctamente', async () => {
    const client = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    pool.connect.mockResolvedValue(client);

    await expect(
      CasaFarmaceuticaDAO.ejecutarEnTransaccion(async () => 'resultado'),
    ).resolves.toBe('resultado');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('crea una casa farmacéutica', async () => {
    const fila = { id_casa: 1, nombre: 'Bayer' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CasaFarmaceuticaDAO.crear({ nombre: 'Bayer' })).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO casa_farmaceutica'),
      ['Bayer'],
    );
  });

  it('obtiene todas las casas ordenadas por id', async () => {
    const filas = [{ id_casa: 1 }, { id_casa: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CasaFarmaceuticaDAO.obtenerTodos()).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY id_casa'));
  });

  it('devuelve null cuando no encuentra la casa por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(CasaFarmaceuticaDAO.obtenerPorId(99)).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [99]);
  });

  it('busca una casa por nombre sin distinguir mayúsculas', async () => {
    const fila = { id_casa: 1, nombre: 'Bayer' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CasaFarmaceuticaDAO.obtenerPorNombre('bayer')).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(nombre) = LOWER($1)'),
      ['bayer'],
    );
  });

  it('actualiza solo el nombre enviado, conservando el resto', async () => {
    const fila = { id_casa: 1, nombre: 'Bayer S.A.' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      CasaFarmaceuticaDAO.actualizar(1, { nombre: 'Bayer S.A.' }),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['Bayer S.A.', 1]);
  });

  it('cambia el estado activo de la casa', async () => {
    const fila = { id_casa: 1, activo: false };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CasaFarmaceuticaDAO.cambiarActivo(1, false)).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [false, 1]);
  });

  it('elimina una casa y devuelve la fila eliminada', async () => {
    const fila = { id_casa: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CasaFarmaceuticaDAO.eliminar(1)).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM casa_farmaceutica'), [1]);
  });

  it('resume los productos, lotes y sucursales que usan la casa', async () => {
    const uso = { productos: 2, lotes: 4, sucursales: 2 };
    pool.query.mockResolvedValue({ rows: [uso] });

    await expect(CasaFarmaceuticaDAO.obtenerUso(1)).resolves.toEqual(uso);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(DISTINCT l.id_sucursal)'),
      [1],
    );
  });

  it('obtiene los proveedores vinculados a una casa', async () => {
    const filas = [{ id_proveedor: 1, nombre: 'Proveedor Uno', activo: true }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CasaFarmaceuticaDAO.obtenerProveedoresVinculados(1)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN casa_proveedor'),
      [1],
    );
  });
});
