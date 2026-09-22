jest.mock('../database/db');

const pool = require('../database/db');
const VentaDAO = require('./VentaDAO');

describe('VentaDAO', () => {
  describe('ejecutarEnTransaccion', () => {
    it('confirma la transacción cuando toda la operación termina correctamente', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(client);
      const operacion = jest.fn().mockResolvedValue('resultado');

      const resultado = await VentaDAO.ejecutarEnTransaccion(operacion);

      expect(resultado).toBe('resultado');
      expect(client.query.mock.calls.map(([consulta]) => consulta)).toEqual([
        'BEGIN',
        'COMMIT',
      ]);
      expect(client.release).toHaveBeenCalled();
    });

    it('revierte la transacción si falla cualquier parte de la venta', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(client);
      const error = new Error('Stock insuficiente');

      await expect(
        VentaDAO.ejecutarEnTransaccion(async () => {
          throw error;
        }),
      ).rejects.toThrow('Stock insuficiente');

      expect(client.query.mock.calls.map(([consulta]) => consulta)).toEqual([
        'BEGIN',
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalled();
    });
  });

  it('bloquea los lotes consultados para evitar ventas concurrentes sin stock', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };

    await VentaDAO.obtenerLotesParaVenta([1, 2], client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE OF l'),
      [[1, 2]],
    );
    expect(client.query.mock.calls[0][0]).toContain('p.precio_compra');
  });

  it('guarda el costo unitario histórico en el detalle de venta', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_detalle_venta: 15 }],
      }),
    };

    await VentaDAO.crearDetalle({
      id_venta: 4,
      id_lote: 8,
      cantidad: 2,
      precio_unitario: '12.50',
      costo_unitario: '7.25',
    }, client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('costo_unitario'),
      [4, 8, 2, '12.50', '7.25'],
    );
  });

  it('descuenta stock únicamente cuando hay existencias suficientes', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_lote: 8, stock_actual: 3 }],
      }),
    };

    const resultado = await VentaDAO.descontarStock(8, 2, client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('stock_actual >= $1'),
      [2, 8],
    );
    expect(resultado).toEqual({ id_lote: 8, stock_actual: 3 });
  });
});
