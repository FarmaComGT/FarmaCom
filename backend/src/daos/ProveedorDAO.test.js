jest.mock('../database/db');

const pool = require('../database/db');
const ProveedorDAO = require('./ProveedorDAO');

describe('ProveedorDAO', () => {
  it('crea un proveedor', async () => {
    const fila = { id_proveedor: 1, nombre: 'Distribuidora ABC' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ProveedorDAO.crear({ nombre: 'Distribuidora ABC' })).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO proveedor'),
      ['Distribuidora ABC'],
    );
  });

  it('obtiene todos los proveedores ordenados por id', async () => {
    const filas = [{ id_proveedor: 1 }, { id_proveedor: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ProveedorDAO.obtenerTodos()).resolves.toEqual(filas);
  });

  it('devuelve null cuando no encuentra el proveedor por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ProveedorDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('busca un proveedor por nombre sin distinguir mayúsculas', async () => {
    const fila = { id_proveedor: 1, nombre: 'Distribuidora ABC' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ProveedorDAO.obtenerPorNombre('distribuidora abc')).resolves.toEqual(fila);
  });

  it('actualiza el nombre del proveedor', async () => {
    const fila = { id_proveedor: 1, nombre: 'Nuevo nombre' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ProveedorDAO.actualizar(1, { nombre: 'Nuevo nombre' }),
    ).resolves.toEqual(fila);
  });

  it('cambia el estado activo del proveedor', async () => {
    const fila = { id_proveedor: 1, activo: false };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ProveedorDAO.cambiarActivo(1, false)).resolves.toEqual(fila);
  });

  it('elimina un proveedor', async () => {
    const fila = { id_proveedor: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ProveedorDAO.eliminar(1)).resolves.toEqual(fila);
  });
});
