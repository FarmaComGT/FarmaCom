jest.mock('../database/db');

const pool = require('../database/db');
const ClienteTelefonoDAO = require('./ClienteTelefonoDAO');

describe('ClienteTelefonoDAO', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crea un teléfono para un cliente', async () => {
    const fila = { id_telefono: 1, id_cliente: 3, numero: '55551234' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ClienteTelefonoDAO.crear({ id_cliente: 3, numero: '55551234' }),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cliente_telefono'),
      [3, '55551234'],
    );
  });

  it('obtiene los teléfonos de un cliente ordenados por id', async () => {
    const filas = [{ id_telefono: 1 }, { id_telefono: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ClienteTelefonoDAO.obtenerPorCliente(3)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY id_telefono'), [3]);
  });

  it('busca un número dentro de un cliente', async () => {
    const fila = { id_telefono: 1, id_cliente: 3, numero: '55551234' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ClienteTelefonoDAO.obtenerPorClienteYNumero(3, '55551234'),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id_cliente = $1 AND numero = $2'),
      [3, '55551234'],
    );
  });

  it('devuelve null si el cliente no tiene ese número', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ClienteTelefonoDAO.obtenerPorClienteYNumero(3, '55559999')).resolves.toBeNull();
  });

  it('actualiza y elimina un teléfono por id', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_telefono: 1, numero: '55559999' }] });

    await expect(
      ClienteTelefonoDAO.actualizar(1, { numero: '55559999' }),
    ).resolves.toEqual({ id_telefono: 1, numero: '55559999' });
    await expect(ClienteTelefonoDAO.eliminar(1)).resolves.toEqual({
      id_telefono: 1,
      numero: '55559999',
    });
  });
});
