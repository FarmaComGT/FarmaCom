jest.mock('../database/db');

const pool = require('../database/db');
const MovimientoInventarioDAO = require('./MovimientoInventarioDAO');

describe('MovimientoInventarioDAO', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra todos los datos necesarios para auditar un cambio de stock', async () => {
    const movimiento = {
      id_lote: 4,
      tipo: 'ajuste',
      cantidad_anterior: 12,
      cantidad_nueva: 10,
      id_usuario: 7,
      id_sucursal: 2,
      motivo: 'Conteo físico',
      referencia: 'ajuste:lote:4',
    };
    pool.query.mockResolvedValue({ rows: [{ id_movimiento: 1, ...movimiento }] });

    await expect(MovimientoInventarioDAO.registrar(movimiento)).resolves.toEqual({
      id_movimiento: 1,
      ...movimiento,
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO movimiento_inventario'),
      [4, 'ajuste', 12, 10, 7, 2, 'Conteo físico', 'ajuste:lote:4'],
    );
  });

  it('consulta la bitácora del lote en orden cronológico inverso', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_movimiento: 2 }] });

    await expect(MovimientoInventarioDAO.obtenerPorLote(4)).resolves.toEqual([
      { id_movimiento: 2 },
    ]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY mi.fecha_movimiento DESC, mi.id_movimiento DESC'),
      [4],
    );
  });
});
