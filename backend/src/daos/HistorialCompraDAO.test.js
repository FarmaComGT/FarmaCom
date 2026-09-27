jest.mock('../database/db');

const pool = require('../database/db');
const HistorialCompraDAO = require('./HistorialCompraDAO');

describe('HistorialCompraDAO', () => {
  it('consulta el historial solo por cliente cuando no hay filtros adicionales', async () => {
    const filas = [{ id_venta: 1 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(HistorialCompraDAO.obtenerPorCliente({ id_cliente: 5 })).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('v.id_cliente = $1'),
      [5],
    );
  });

  it('agrega condiciones y placeholders en orden cuando vienen todos los filtros', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await HistorialCompraDAO.obtenerPorCliente({
      id_cliente: 5,
      id_sucursal: 2,
      estado: 'completada',
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-01-31',
    });

    const [sql, valores] = pool.query.mock.calls[0];
    expect(valores).toEqual([5, 2, 'completada', '2026-01-01', '2026-01-31']);
    expect(sql).toEqual(expect.stringContaining('v.id_sucursal = $2'));
    expect(sql).toEqual(expect.stringContaining('v.estado = $3'));
    expect(sql).toEqual(expect.stringContaining('v.fecha_venta >= $4::date'));
    expect(sql).toEqual(expect.stringContaining("v.fecha_venta < ($5::date + INTERVAL '1 day')"));
  });
});
