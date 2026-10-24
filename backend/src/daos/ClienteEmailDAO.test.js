jest.mock('../database/db');

const pool = require('../database/db');
const ClienteEmailDAO = require('./ClienteEmailDAO');

describe('ClienteEmailDAO', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crea un correo para un cliente', async () => {
    const fila = { id_email: 1, id_cliente: 3, correo: 'ana@farmacom.test' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ClienteEmailDAO.crear({ id_cliente: 3, correo: 'ana@farmacom.test' }),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cliente_email'),
      [3, 'ana@farmacom.test'],
    );
  });

  it('obtiene los correos de un cliente ordenados por id', async () => {
    const filas = [{ id_email: 1 }, { id_email: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(ClienteEmailDAO.obtenerPorCliente(3)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY id_email'), [3]);
  });

  it('busca un correo dentro de un cliente sin distinguir mayúsculas', async () => {
    const fila = { id_email: 1, id_cliente: 3, correo: 'ana@farmacom.test' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      ClienteEmailDAO.obtenerPorClienteYCorreo(3, 'ANA@farmacom.test'),
    ).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(correo) = LOWER($2)'),
      [3, 'ANA@farmacom.test'],
    );
  });

  it('devuelve null si el cliente no tiene ese correo', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(ClienteEmailDAO.obtenerPorClienteYCorreo(3, 'otro@farmacom.test')).resolves.toBeNull();
  });

  it('actualiza y elimina un correo por id', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_email: 1, correo: 'nuevo@farmacom.test' }] });

    await expect(
      ClienteEmailDAO.actualizar(1, { correo: 'nuevo@farmacom.test' }),
    ).resolves.toEqual({ id_email: 1, correo: 'nuevo@farmacom.test' });
    await expect(ClienteEmailDAO.eliminar(1)).resolves.toEqual({
      id_email: 1,
      correo: 'nuevo@farmacom.test',
    });
  });
});
