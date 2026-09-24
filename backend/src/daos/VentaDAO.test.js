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
      expect.stringMatching(/INSERT INTO detalle_venta[\s\S]*costo_unitario[\s\S]*RETURNING \*/),
      [4, 8, 2, '12.50', '7.25'],
    );
  });

  it('vincula la venta con la sesión de caja', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ id_venta: 21 }] }),
    };

    await VentaDAO.crearVenta({
      id_sucursal: 1,
      id_usuario: 7,
      id_sesion_caja: 9,
      id_cliente: null,
      metodo_pago: 'efectivo',
      proveedor_pago: null,
      referencia_pago: null,
      estado_pago: null,
      autorizacion_pago: null,
      tarjeta_ultimos4: null,
      total: '25.00',
      monto_recibido: '30.00',
      cambio: '5.00',
    }, client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('id_sesion_caja'),
      [1, 7, 9, null, 'efectivo', null, null, null, null, null, '25.00', '30.00', '5.00'],
  it('guarda la fotografía calculada de los detalles del pago POS como JSON', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ id_pago_pos: 5 }] }),
    };
    const detalles = [{
      id_lote: 8,
      cantidad: 2,
      precio_unitario: '12.50',
      costo_unitario: '7.25',
    }];

    await VentaDAO.crearPagoPOS({
      external_id: 'farmacom-pos-test',
      id_sucursal: 1,
      id_usuario: 7,
      id_cliente: null,
      terminal_id: 'trm_test_123',
      total: '25.00',
      detalles,
    }, client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO pago_pos[\s\S]*\$7::jsonb/),
      ['farmacom-pos-test', 1, 7, null, 'trm_test_123', '25.00', JSON.stringify(detalles)],
    );
  });

  it('bloquea el pago POS mientras procesa un webhook', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id_pago_pos: 5 }] }) };

    await VentaDAO.obtenerPagoPOSPorExternalId('farmacom-pos-test', client, true);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE'),
      ['farmacom-pos-test'],
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
