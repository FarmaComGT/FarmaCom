jest.mock('../database/db');

const pool = require('../database/db');
const ContactoSucursalDAO = require('./ContactoSucursalDAO');

describe('ContactoSucursalDAO', () => {
  it('obtiene teléfonos y correos de una sucursal en paralelo', async () => {
    const telefonos = [{ id_telefono: 1 }];
    const correos = [{ id_correo: 1 }];
    pool.query.mockImplementation((sql) => {
      if (sql.includes('telefono_sucursal')) return Promise.resolve({ rows: telefonos });
      return Promise.resolve({ rows: correos });
    });

    await expect(ContactoSucursalDAO.obtenerPorSucursal(1)).resolves.toEqual({
      telefonos,
      correos,
    });
  });

  it('agrega un teléfono a la sucursal', async () => {
    const fila = { id_telefono: 1, id_sucursal: 1, numero: '123' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ContactoSucursalDAO.agregarTelefono(1, '123')).resolves.toEqual(fila);
  });

  it('elimina un teléfono validando que pertenezca a la sucursal', async () => {
    const fila = { id_telefono: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ContactoSucursalDAO.eliminarTelefono(1, 5)).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 5]);
  });

  it('devuelve null al eliminar un teléfono que no pertenece a la sucursal', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ContactoSucursalDAO.eliminarTelefono(1, 5)).resolves.toBeNull();
  });

  it('agrega un correo a la sucursal', async () => {
    const fila = { id_correo: 1, id_sucursal: 1, correo: 'a@b.com' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ContactoSucursalDAO.agregarCorreo(1, 'a@b.com')).resolves.toEqual(fila);
  });

  it('elimina un correo validando que pertenezca a la sucursal', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ContactoSucursalDAO.eliminarCorreo(1, 5)).resolves.toBeNull();
  });
});
