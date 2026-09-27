jest.mock('../database/db');

const pool = require('../database/db');
const TelefonoSucursalDAO = require('./TelefonoSucursalDAO');

describe('TelefonoSucursalDAO', () => {
  it('crea un teléfono para una sucursal', async () => {
    const fila = { id_telefono_sucursal: 1, id_sucursal: 1, numero: '123' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      TelefonoSucursalDAO.crear({ id_sucursal: 1, numero: '123' }),
    ).resolves.toEqual(fila);
  });

  it('obtiene todos los teléfonos ordenados por id', async () => {
    const filas = [{ id_telefono_sucursal: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(TelefonoSucursalDAO.obtenerTodos()).resolves.toEqual(filas);
  });

  it('devuelve null si el teléfono no existe por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(TelefonoSucursalDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('obtiene los teléfonos de una sucursal', async () => {
    const filas = [{ id_telefono_sucursal: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(TelefonoSucursalDAO.obtenerPorSucursal(1)).resolves.toEqual(filas);
  });

  it('actualiza el número', async () => {
    const fila = { id_telefono_sucursal: 1, numero: '456' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      TelefonoSucursalDAO.actualizar(1, { numero: '456' }),
    ).resolves.toEqual(fila);
  });

  it('elimina un teléfono por id', async () => {
    const fila = { id_telefono_sucursal: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(TelefonoSucursalDAO.eliminar(1)).resolves.toEqual(fila);
  });

  it('elimina todos los teléfonos de una sucursal', async () => {
    const filas = [{ id_telefono_sucursal: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(TelefonoSucursalDAO.eliminarPorSucursal(1)).resolves.toEqual(filas);
  });
});
