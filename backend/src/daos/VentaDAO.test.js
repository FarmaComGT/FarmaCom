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
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await VentaDAO.obtenerLotesParaVenta([1, 2], client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE OF l'),
      [[1, 2]],
    );
    expect(client.query.mock.calls[0][0]).toContain('l.precio_compra');
    expect(client.query.mock.calls[0][0]).toContain(
      'COALESCE(l.fecha_vencimiento < CURRENT_DATE, FALSE) AS vencido',
    );
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
      expect.stringMatching(
        /INSERT INTO detalle_venta[\s\S]*costo_unitario[\s\S]*RETURNING \*/,
      ),
      [4, 8, 2, '12.50', '7.25'],
    );
  });

  it('vincula la venta con la sesión de caja', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_venta: 21 }],
      }),
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
      [
        1,
        7,
        9,
        null,
        'efectivo',
        null,
        null,
        null,
        null,
        null,
        '25.00',
        '30.00',
        '5.00',
      ],
    );
  });

  it('guarda la fotografía calculada de los detalles del pago POS como JSON', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_pago_pos: 5 }],
      }),
    };
    const detalles = [
      {
        id_lote: 8,
        cantidad: 2,
        precio_unitario: '12.50',
        costo_unitario: '7.25',
      },
    ];

    await VentaDAO.crearPagoPOS({
      external_id: 'farmacom-pos-test',
      id_sucursal: 1,
      id_usuario: 7,
      id_sesion_caja: 9,
      id_cliente: null,
      terminal_id: 'trm_test_123',
      total: '25.00',
      detalles,
    }, client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO pago_pos[\s\S]*\$8::jsonb/),
      [
        'farmacom-pos-test',
        1,
        7,
        9,
        null,
        'trm_test_123',
        '25.00',
        JSON.stringify(detalles),
      ],
    );
  });

  it('bloquea el pago POS mientras procesa un webhook', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_pago_pos: 5 }],
      }),
    };

    await VentaDAO.obtenerPagoPOSPorExternalId(
      'farmacom-pos-test',
      client,
      true,
    );

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
    expect(resultado).toEqual({
      id_lote: 8,
      stock_actual: 3,
    });
  });

  it('busca un cliente por id', async () => {
    pool.query.mockResolvedValue({
      rows: [{ id_cliente: 5 }],
    });

    await expect(
      VentaDAO.obtenerClientePorId(5),
    ).resolves.toEqual({
      id_cliente: 5,
    });
  });

  it('devuelve null cuando el cliente no existe', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(
      VentaDAO.obtenerClientePorId(99),
    ).resolves.toBeNull();
  });

  it('actualiza el pago POS combinando los campos enviados', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_pago_pos: 5, estado: 'aprobado' }],
      }),
    };

    const resultado = await VentaDAO.actualizarPagoPOS({
      external_id: 'farmacom-pos-test',
      estado: 'aprobado',
      estado_pago: 'completado',
      comando_recurrente_id: null,
      evento_recurrente_id: null,
      referencia_pago: 'ref-1',
      autorizacion_pago: 'auth-1',
      tarjeta_ultimos4: '1234',
      id_venta: 10,
    }, client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE pago_pos'),
      [
        'farmacom-pos-test',
        'aprobado',
        'completado',
        null,
        null,
        'ref-1',
        'auth-1',
        '1234',
        10,
      ],
    );
    expect(resultado).toEqual({
      id_pago_pos: 5,
      estado: 'aprobado',
    });
  });

  describe('obtenerTodas', () => {
    it('sin filtros no agrega WHERE', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await VentaDAO.obtenerTodas();

      expect(pool.query.mock.calls[0][0]).not.toContain('WHERE');
      expect(pool.query.mock.calls[0][1]).toEqual([]);
    });

    it('con todos los filtros arma las condiciones en orden', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id_venta: 1 }],
      });

      await VentaDAO.obtenerTodas({
        id_sucursal: 1,
        id_cliente: 2,
        estado: 'completada',
        fecha_desde: '2026-01-01',
        fecha_hasta: '2026-01-31',
      });

      const [sql, valores] = pool.query.mock.calls[0];

      expect(valores).toEqual([
        1,
        2,
        'completada',
        '2026-01-01',
        '2026-01-31',
      ]);
      expect(sql).toContain('v.id_sucursal = $1');
      expect(sql).toContain('v.id_cliente = $2');
    });

    it('interpreta el rango del historial en la zona horaria de Guatemala', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await VentaDAO.obtenerTodas({
        fecha_desde: '2026-10-10',
        fecha_hasta: '2026-10-10',
      });

      const [consulta, valores] = pool.query.mock.calls[0];

      expect(consulta).toContain(
        "v.fecha_venta >= ($1::DATE::TIMESTAMP AT TIME ZONE 'America/Guatemala')",
      );
      expect(consulta).toContain(
        "v.fecha_venta < (($2::DATE + 1)::TIMESTAMP AT TIME ZONE 'America/Guatemala')",
      );
      expect(valores).toEqual([
        '2026-10-10',
        '2026-10-10',
      ]);
    });
  });

  it('obtiene una venta con sus detalles agregados en JSON', async () => {
    const fila = {
      id_venta: 1,
      detalles: [],
    };
    pool.query.mockResolvedValue({
      rows: [fila],
    });

    await expect(
      VentaDAO.obtenerPorId(1),
    ).resolves.toEqual(fila);
  });

  it('devuelve null cuando la venta no existe', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(
      VentaDAO.obtenerPorId(99),
    ).resolves.toBeNull();
  });

  it('bloquea la venta para actualizarla dentro de una transacción', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_venta: 1 }],
      }),
    };

    await VentaDAO.obtenerParaActualizar(1, client);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE'),
      [1],
    );
  });

  it('obtiene los detalles de una venta bloqueados para anulación', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_lote: 1, cantidad: 2 }],
      }),
    };

    await expect(
      VentaDAO.obtenerDetallesParaAnulacion(1, client),
    ).resolves.toEqual([
      {
        id_lote: 1,
        cantidad: 2,
      },
    ]);
  });

  it('restaura el stock de un lote', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_lote: 1, stock_actual: 10 }],
      }),
    };

    await expect(
      VentaDAO.restaurarStock(1, 5, client),
    ).resolves.toEqual({
      id_lote: 1,
      stock_actual: 10,
    });
  });

  it('actualiza el cliente asociado a una venta', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_venta: 1, id_cliente: 7 }],
      }),
    };

    await expect(
      VentaDAO.actualizarCliente(1, 7, client),
    ).resolves.toEqual({
      id_venta: 1,
      id_cliente: 7,
    });
  });

  it('anula una venta registrando el motivo', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_venta: 1, estado: 'anulada' }],
      }),
    };

    await expect(
      VentaDAO.anular(1, 'Error de cobro', 7, client),
    ).resolves.toEqual({
      id_venta: 1,
      estado: 'anulada',
    });

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("AND estado = 'completada'"),
      ['Error de cobro', 7, 1],
    );
  });

  it('devuelve null cuando otra solicitud ya anuló la venta', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await expect(
      VentaDAO.anular(1, 'Solicitud repetida', 7, client),
    ).resolves.toBeNull();
  });
});

describe('VentaDAO - stock del carrito y cancelación', () => {
  const crearCliente = (filas = []) => ({ query: jest.fn().mockResolvedValue({ rows: filas }) });

  it.each([
    ['descontarStock', (c) => VentaDAO.descontarStock(1, 99, c)],
    ['restaurarStock', (c) => VentaDAO.restaurarStock(1, 2, c)],
    ['obtenerParaActualizar', (c) => VentaDAO.obtenerParaActualizar(99, c)],
    ['actualizarCliente', (c) => VentaDAO.actualizarCliente(99, 3, c)],
    ['obtenerPagoPOSPorExternalId', (c) => VentaDAO.obtenerPagoPOSPorExternalId('no-existe', c)],
    ['actualizarPagoPOS', (c) => VentaDAO.actualizarPagoPOS({ external_id: 'no-existe' }, c)],
  ])('%s devuelve null cuando no afecta ninguna fila', async (_metodo, operacion) => {
    await expect(operacion(crearCliente())).resolves.toBeNull();
  });

  it('restaura el stock sumando la cantidad devuelta', async () => {
    const cliente = crearCliente([{ id_lote: 1, stock_actual: 6 }]);

    await expect(VentaDAO.restaurarStock(1, 2, cliente)).resolves.toEqual({ id_lote: 1, stock_actual: 6 });
    expect(cliente.query).toHaveBeenCalledWith(expect.stringContaining('stock_actual = stock_actual + $1'), [2, 1]);
  });

  it('desasocia el cliente de una venta cuando se envía undefined', async () => {
    const cliente = crearCliente([{ id_venta: 21, id_cliente: null }]);

    await VentaDAO.actualizarCliente(21, undefined, cliente);

    expect(cliente.query).toHaveBeenCalledWith(expect.any(String), [null, 21]);
  });

  it('consulta un pago POS sin bloquearlo por defecto', async () => {
    const cliente = crearCliente([{ external_id: 'farmacom-pos-1' }]);

    await VentaDAO.obtenerPagoPOSPorExternalId('farmacom-pos-1', cliente);

    expect(cliente.query.mock.calls[0][0]).not.toContain('FOR UPDATE');
  });

  it('actualiza solo el estado de un pago POS conservando el resto de campos', async () => {
    const cliente = crearCliente([{ external_id: 'farmacom-pos-1', estado: 'fallido' }]);

    await VentaDAO.actualizarPagoPOS({ external_id: 'farmacom-pos-1', estado: 'fallido' }, cliente);

    expect(cliente.query.mock.calls[0][1]).toEqual([
      'farmacom-pos-1', 'fallido', null, null, null, null, null, null, null,
    ]);
  });
});
