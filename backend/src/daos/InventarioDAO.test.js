jest.mock('../database/db');

const pool = require('../database/db');
const InventarioDAO = require('./InventarioDAO');

const normalizarConsulta = (consulta) => consulta.replace(/\s+/g, ' ').trim();

describe('InventarioDAO', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  describe('obtenerPorSucursal', () => {
    it('incluye productos sin lotes y expone estados independientes', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await InventarioDAO.obtenerPorSucursal(3);

      const consulta = normalizarConsulta(pool.query.mock.calls[0][0]);
      expect(consulta).toContain(
        'LEFT JOIN v_lote_estado v ON v.id_producto = p.id_producto',
      );
      expect(consulta).toContain("WHEN COUNT(v.id_lote) = 0 THEN 'sin_lotes'");
      expect(consulta).toContain(
        "WHEN COALESCE(SUM(v.stock_actual), 0) = 0 THEN 'agotado'",
      );
      expect(consulta).toContain(
        "WHEN COALESCE(SUM(v.stock_actual), 0) <= p.stock_minimo THEN 'poco_stock'",
      );
      expect(consulta).toContain('END AS estado_stock');
      expect(consulta).toContain('END AS estado_vencimiento');
      expect(consulta).not.toContain('p.precio_compra');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [3]);
    });

    it('ignora lotes sin existencias en las alertas de vencimiento', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await InventarioDAO.obtenerPorSucursal(3);

      const consulta = normalizarConsulta(pool.query.mock.calls[0][0]);
      expect(consulta).toContain(
        "WHERE v.estado_vencimiento = 'vencido' AND v.stock_actual > 0",
      );
      expect(consulta).toContain(
        "WHERE v.estado_vencimiento = 'proximo_a_vencer' AND v.stock_actual > 0",
      );
    });

    it('mantiene el estado consolidado mientras se migra la pantalla anterior', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await InventarioDAO.obtenerPorSucursal(3);

      const consulta = normalizarConsulta(pool.query.mock.calls[0][0]);
      expect(consulta).toContain(
        "WHEN estado_vencimiento = 'vencido' THEN 'vencido'",
      );
      expect(consulta).toContain('END AS estado_consolidado');
    });
  });

  describe('obtenerResumenPorSucursal', () => {
    it('devuelve conteos independientes para stock y vencimiento', async () => {
      const resumen = {
        total_productos: '1',
        productos_sin_lotes: '0',
        productos_agotados: '0',
        productos_poco_stock: '0',
        productos_vencidos: '0',
        productos_criticos: '0',
        productos_proximos_vencer: '0',
        productos_optimos: '1',
      };
      pool.query.mockResolvedValue({ rows: [resumen] });

      const resultado = await InventarioDAO.obtenerResumenPorSucursal(3);

      const consulta = normalizarConsulta(pool.query.mock.calls[0][0]);
      expect(consulta).toContain(
        'LEFT JOIN v_lote_estado v ON v.id_producto = p.id_producto',
      );
      expect(consulta).toContain(
        "WHERE estado_stock = 'sin_lotes' ) AS productos_sin_lotes",
      );
      expect(consulta).toContain(
        "WHERE estado_stock = 'poco_stock' ) AS productos_poco_stock",
      );
      expect(consulta).toContain(
        "WHERE estado_vencimiento = 'vencido' ) AS productos_vencidos",
      );
      expect(resultado).toEqual(resumen);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [3]);
    });
  });
});
