jest.mock('../database/db');

const pool = require('../database/db');
const HistorialPrecioLoteDAO = require('./HistorialPrecioLoteDAO');

describe('HistorialPrecioLoteDAO', () => {
  it('registra una fila por cada tipo de precio que cambio', async () => {
    const client = { query: jest.fn() };
    client.query
      .mockResolvedValueOnce({ rows: [{ id_historial_precio: 1, tipo_precio: 'compra' }] })
      .mockResolvedValueOnce({ rows: [{ id_historial_precio: 2, tipo_precio: 'venta' }] });

    const resultado = await HistorialPrecioLoteDAO.registrarCambios(
      7,
      9,
      { precio_compra: '10.00', precio_venta: '15.00' },
      { precio_compra: '11.00', precio_venta: '16.50' },
      client,
    );

    expect(client.query).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      [7, 'compra', 10, 11, 9],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      [7, 'venta', 15, 16.5, 9],
    );
    expect(resultado).toHaveLength(2);
  });

  it('omite valores que no cambiaron', async () => {
    const client = { query: jest.fn() };

    const resultado = await HistorialPrecioLoteDAO.registrarCambios(
      7,
      9,
      { precio_compra: '10.00', precio_venta: '15.00' },
      { precio_compra: '10.00', precio_venta: '15.00' },
      client,
    );

    expect(client.query).not.toHaveBeenCalled();
    expect(resultado).toEqual([]);
  });

  it('consulta el historial mas reciente del lote', async () => {
    const filas = [{ id_historial_precio: 3, id_lote: 7 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(HistorialPrecioLoteDAO.obtenerPorLote(7)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [7]);
  });
});
