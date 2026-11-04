jest.mock('../database/db');

const pool = require('../database/db');
const ClienteDAO = require('./ClienteDAO');

describe('clientes paginados', () => {
  it('busca en SQL y ajusta una página fuera del rango', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '11' }] })
      .mockResolvedValueOnce({ rows: [{ id_cliente: 11 }] });
    const resultado = await ClienteDAO.obtenerPaginados({ pagina: 9, limite: 10, busqueda: '  María%  ' });
    expect(resultado.paginacion).toEqual({ pagina: 2, limite: 10, total: 11, total_paginas: 2 });
    expect(pool.query.mock.calls.at(-2)).toEqual([
      expect.stringContaining('strpos'), ['maría%'],
    ]);
    expect(pool.query.mock.calls.at(-1)).toEqual([
      expect.stringContaining('ORDER BY nombre_cliente, id_cliente LIMIT $2 OFFSET $3'), ['maría%', 10, 10],
    ]);
  });
});

describe('ClienteDAO', () => {
  it('crea un cliente incluyendo su NIT', async () => {
    const fila = { id_cliente: 1, nombre_cliente: 'Ana', nit: '1234567-1' };
    pool.query.mockResolvedValue({ rows: [fila] });

    const resultado = await ClienteDAO.crear({
      nombre_cliente: 'Ana',
      nit: '1234567-1',
      observaciones: null,
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cliente (nombre_cliente, nit, observaciones)'),
      ['Ana', '1234567-1', null],
    );
    expect(resultado).toEqual(fila);
  });

  it('busca un cliente por NIT', async () => {
    const fila = { id_cliente: 1, nit: '1234567-K' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(ClienteDAO.obtenerPorNit('1234567-K')).resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM cliente WHERE nit = $1',
      ['1234567-K'],
    );
  });

  it('distingue entre omitir el NIT y limpiarlo', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_cliente: 3, nit: null }] });

    await ClienteDAO.actualizar(3, { nombre_cliente: 'Carlos', nit: null });

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [
      'Carlos', undefined, true, null, 3,
    ]);
  });
});
