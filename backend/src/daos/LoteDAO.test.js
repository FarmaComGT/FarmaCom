jest.mock('../database/db');

const pool = require('../database/db');
const LoteDAO = require('./LoteDAO');

describe('LoteDAO', () => {
  describe('ejecutarEnTransaccion', () => {
    it('confirma y libera la conexion cuando la operacion termina', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(client);

      await expect(
        LoteDAO.ejecutarEnTransaccion(async () => 'resultado'),
      ).resolves.toBe('resultado');

      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('revierte y libera la conexion cuando falla la operacion', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(client);

      await expect(
        LoteDAO.ejecutarEnTransaccion(async () => {
          throw new Error('fallo');
        }),
      ).rejects.toThrow('fallo');

      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('obtenerPorNumeroLote', () => {
    it('permite excluir el lote que se esta editando', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const resultado = await LoteDAO.obtenerPorNumeroLote('LT-01', 2, 3, 7);

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['LT-01', 2, 3, 7]);
      expect(resultado).toBeNull();
    });
  });

  describe('crear', () => {
    it('usa el cliente recibido para participar en una transacción', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [{ id_lote: 8 }] }),
      };

      const resultado = await LoteDAO.crear({
        id_producto: 2,
        id_proveedor: 3,
        id_sucursal: 4,
        numero_lote: 'LT-08',
        fecha_vencimiento: null,
        cantidad_ingresada: 12,
        precio_compra: 8,
        precio_venta: 12,
        margen_ganancia: 50,
      }, client);

      expect(client.query).toHaveBeenCalledWith(expect.any(String), [
        2, 3, 4, 'LT-08', null, 12, 8, 12, 50, null, null,
      ]);
      expect(pool.query).not.toHaveBeenCalled();
      expect(resultado).toEqual({ id_lote: 8 });
    });
  });

  describe('historial por producto y sucursal', () => {
    it('bloquea la secuencia de ingresos dentro de la transacción', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };

      await LoteDAO.bloquearHistorialProductoSucursal(2, 4, client);

      expect(client.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock($1, $2)',
        [2, 4],
      );
    });

    it('obtiene el lote más reciente de la misma sucursal', async () => {
      const fila = { id_lote: 8, id_producto: 2, id_sucursal: 4 };
      const client = { query: jest.fn().mockResolvedValue({ rows: [fila] }) };

      await expect(
        LoteDAO.obtenerUltimoPorProductoSucursal(2, 4, client),
      ).resolves.toEqual(fila);

      const [consulta, valores] = client.query.mock.calls[0];
      expect(consulta).toContain('WHERE id_producto = $1');
      expect(consulta).toContain('AND id_sucursal = $2');
      expect(consulta).toContain('ORDER BY fecha_ingreso DESC, id_lote DESC');
      expect(consulta).toContain('LIMIT 1');
      expect(valores).toEqual([2, 4]);
    });

    it('devuelve null cuando el producto no tiene lotes en la sucursal', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };

      await expect(
        LoteDAO.obtenerUltimoPorProductoSucursal(2, 4, client),
      ).resolves.toBeNull();
    });
  });

  describe('actualizar', () => {
    it('envia todos los campos editables y la orden de limpiar mayoreo', async () => {
      const fila = { id_lote: 7, numero_lote: 'LT-02' };
      pool.query.mockResolvedValue({ rows: [fila] });

      const resultado = await LoteDAO.actualizar(7, {
        id_producto: 2,
        numero_lote: 'LT-02',
        limpiar_mayoreo: true,
      });

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [
        2, null, null, 'LT-02', null, null, null,
        null, null, null, null, null, true, false, 7,
      ]);
      expect(resultado).toEqual(fila);
    });

    it('permite establecer la fecha de vencimiento en null', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_lote: 7, fecha_vencimiento: null }] });

      await LoteDAO.actualizar(7, { fecha_vencimiento: null });

      const [consulta, valores] = pool.query.mock.calls[0];
      expect(consulta).toContain(
        'fecha_vencimiento  = CASE WHEN $14 THEN $5 ELSE fecha_vencimiento END',
      );
      expect(valores[4]).toBeNull();
      expect(valores[13]).toBe(true);
      expect(valores[14]).toBe(7);
    });
  });

  describe('eliminar', () => {
    it('elimina por id y devuelve la fila eliminada', async () => {
      const fila = { id_lote: 7 };
      pool.query.mockResolvedValue({ rows: [fila] });

      const resultado = await LoteDAO.eliminar(7);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM lote WHERE id_lote = $1 RETURNING *',
        [7],
      );
      expect(resultado).toEqual(fila);
    });
  });
});

describe('LoteDAO - consultas de inventario', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lista los lotes de una sucursal ordenados por vencimiento', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_lote: 1 }] });

    await expect(LoteDAO.obtenerPorSucursal(2)).resolves.toEqual([{ id_lote: 1 }]);
    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE v.id_sucursal = $1');
    expect(sql).toContain('ORDER BY v.fecha_vencimiento ASC NULLS LAST');
    expect(valores).toEqual([2]);
  });

  it('lista los lotes de un producto en todas las sucursales', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_lote: 1, nombre_sucursal: 'Central' }] });

    await expect(LoteDAO.obtenerPorProducto(5)).resolves.toEqual([{ id_lote: 1, nombre_sucursal: 'Central' }]);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE v.id_producto = $1'), [5]);
  });

  it('obtiene un lote con su estado calculado o null', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_lote: 3, estado_stock: 'normal' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(LoteDAO.obtenerPorId(3)).resolves.toEqual({ id_lote: 3, estado_stock: 'normal' });
    await expect(LoteDAO.obtenerPorId(99)).resolves.toBeNull();
    expect(pool.query.mock.calls[0][0]).toContain('FROM v_lote_estado v');
  });

  it('obtiene la fila del lote y la bloquea solo cuando se pide', async () => {
    const clienteFalso = { query: jest.fn().mockResolvedValue({ rows: [{ id_lote: 3 }] }) };

    await LoteDAO.obtenerFilaPorId(3, clienteFalso);
    await LoteDAO.obtenerFilaPorId(3, clienteFalso, true);

    expect(clienteFalso.query.mock.calls[0][0]).not.toContain('FOR UPDATE');
    expect(clienteFalso.query.mock.calls[1][0]).toContain('FOR UPDATE');
  });

  it('descuenta stock solo cuando alcanza la existencia', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_lote: 3, stock_actual: 7 }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(LoteDAO.decrementarStock(3, 2)).resolves.toEqual({ id_lote: 3, stock_actual: 7 });
    await expect(LoteDAO.decrementarStock(3, 50)).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('AND stock_actual >= $1'), [2, 3]);
  });

  it('lista alertas de todas las sucursales', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_lote: 1, estado_vencimiento: 'vencido' }] });

    await LoteDAO.obtenerAlertas();

    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain("v.estado_vencimiento != 'normal' OR v.estado_stock != 'normal'");
    expect(sql).not.toContain('AND v.id_sucursal');
    expect(valores).toEqual([]);
  });

  it('filtra las alertas por sucursal', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await LoteDAO.obtenerAlertas(2);

    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('AND v.id_sucursal = $1');
    expect(valores).toEqual([2]);
  });
});
