jest.mock('../database/db');

const pool = require('../database/db');
const ProveedorEmailDAO = require('./ProveedorEmailDAO');

describe('ProveedorEmailDAO', () => {
  it('crea un correo para un proveedor', async () => {
    const fila = { id_email: 1, id_proveedor: 1, correo: 'a@b.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ProveedorEmailDAO.crear({ id_proveedor: 1, correo: 'a@b.com' }),
    ).resolves.toEqual(fila);
  });

  it('obtiene los correos de un proveedor', async () => {
    const filas = [{ id_email: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ProveedorEmailDAO.obtenerPorProveedor(1)).resolves.toEqual(filas);
  });

  it('devuelve null si el correo no existe por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ProveedorEmailDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('busca un correo exacto', async () => {
    const fila = { id_email: 1, correo: 'a@b.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ProveedorEmailDAO.obtenerPorCorreo('a@b.com')).resolves.toEqual(fila);
  });

  it('actualiza el correo', async () => {
    const fila = { id_email: 1, correo: 'nuevo@b.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ProveedorEmailDAO.actualizar(1, { correo: 'nuevo@b.com' }),
    ).resolves.toEqual(fila);
  });

  it('elimina un correo por id', async () => {
    const fila = { id_email: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ProveedorEmailDAO.eliminar(1)).resolves.toEqual(fila);
  });

  it('elimina todos los correos de un proveedor', async () => {
    const filas = [{ id_email: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ProveedorEmailDAO.eliminarPorProveedor(1)).resolves.toEqual(filas);
  });
});
