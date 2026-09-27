jest.mock('../database/db');

const pool = require('../database/db');
const ProveedorTelefonoDAO = require('./ProveedorTelefonoDAO');

describe('ProveedorTelefonoDAO', () => {
  it('crea un teléfono para un proveedor', async () => {
    const fila = { id_telefono: 1, id_proveedor: 1, numero: '123' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ProveedorTelefonoDAO.crear({ id_proveedor: 1, numero: '123' }),
    ).resolves.toEqual(fila);
  });

  it('obtiene los teléfonos de un proveedor', async () => {
    const filas = [{ id_telefono: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ProveedorTelefonoDAO.obtenerPorProveedor(1)).resolves.toEqual(filas);
  });

  it('devuelve null si el teléfono no existe por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ProveedorTelefonoDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('actualiza el número', async () => {
    const fila = { id_telefono: 1, numero: '456' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ProveedorTelefonoDAO.actualizar(1, { numero: '456' }),
    ).resolves.toEqual(fila);
  });

  it('elimina un teléfono por id', async () => {
    const fila = { id_telefono: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ProveedorTelefonoDAO.eliminar(1)).resolves.toEqual(fila);
  });

  it('elimina todos los teléfonos de un proveedor', async () => {
    const filas = [{ id_telefono: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ProveedorTelefonoDAO.eliminarPorProveedor(1)).resolves.toEqual(filas);
  });
});
