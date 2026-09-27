jest.mock('../database/db');

const pool = require('../database/db');
const PresentacionDAO = require('./PresentacionDAO');

describe('PresentacionDAO', () => {
  it('crea una presentación', async () => {
    const fila = { id_presentacion: 1, nombre: 'Caja' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(PresentacionDAO.crear({ nombre: 'Caja' })).resolves.toEqual(fila);
  });

  it('obtiene todas las presentaciones con su conteo de productos asociados', async () => {
    const filas = [{ id_presentacion: 1, nombre: 'Caja', productos_asociados: 3 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(PresentacionDAO.obtenerTodos()).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('productos_asociados'));
  });

  it('devuelve null cuando no encuentra la presentación por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(PresentacionDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('busca una presentación por nombre ignorando espacios y mayúsculas', async () => {
    const fila = { id_presentacion: 1, nombre: 'Caja' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(PresentacionDAO.obtenerPorNombre('  caja  ')).resolves.toEqual(fila);
  });

  it('actualiza el nombre de la presentación', async () => {
    const fila = { id_presentacion: 1, nombre: 'Frasco' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      PresentacionDAO.actualizar(1, { nombre: 'Frasco' }),
    ).resolves.toEqual(fila);
  });

  it('elimina una presentación', async () => {
    const fila = { id_presentacion: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(PresentacionDAO.eliminar(1)).resolves.toEqual(fila);
  });
});
