jest.mock('../database/db');

const pool = require('../database/db');
const PromocionDAO = require('./PromocionDAO');

describe('PromocionDAO', () => {
  it('busca y pagina por nombre, producto y sucursal con parámetros', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [{ id_promocion: 7 }] });
    const resultado = await PromocionDAO.obtenerTodas({ busqueda: 'Mayoreo', id_sucursal: 2, estado: 'vigente', pagina: 1, limite: 10 });
    expect(resultado.paginacion.total).toBe(1);
    expect(pool.query.mock.calls[0][0]).toContain('normalizar_texto_busqueda(pr.nombre) LIKE');
    expect(pool.query.mock.calls[0][0]).toContain('pr.fecha_fin IS NULL');
    expect(pool.query.mock.calls[1][1]).toEqual([2, 'Mayoreo', 10, 0]);
  });

  it('escribe null en fecha_fin sin confundirlo con un campo omitido', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_promocion: 1, fecha_fin: null }] });
    await PromocionDAO.actualizar(1, { fecha_fin: null });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('fecha_fin = $1'), [null, 1]);
  });
  it('crea una promoción', async () => {
    const fila = { id_promocion: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(PromocionDAO.crear({
      id_producto: 1,
      id_sucursal: 1,
      cantidad_minima: 5,
      precio_promocion: 10,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-01-31',
    })).resolves.toEqual(fila);
  });

  it('obtiene las promociones de un producto con el nombre de sucursal', async () => {
    const filas = [{ id_promocion: 1, nombre_sucursal: 'Central' }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(PromocionDAO.obtenerPorProducto(1)).resolves.toEqual(filas);
  });

  it('devuelve null cuando no encuentra la promoción por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(PromocionDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('obtiene el menor precio de un lote vendible del producto en la sucursal', async () => {
    pool.query.mockResolvedValue({ rows: [{ precio_venta_minimo: '12.50' }] });

    await expect(PromocionDAO.obtenerPrecioVentaMinimoDisponible(2, 3))
      .resolves.toBe('12.50');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /MIN\(precio_venta\)[\s\S]*id_producto = \$1[\s\S]*id_sucursal = \$2[\s\S]*stock_actual > 0[\s\S]*fecha_vencimiento >= CURRENT_DATE/,
      ),
      [2, 3],
    );
  });

  it('devuelve null si no existen lotes vendibles con precio', async () => {
    pool.query.mockResolvedValue({ rows: [{ precio_venta_minimo: null }] });

    await expect(PromocionDAO.obtenerPrecioVentaMinimoDisponible(2, 3))
      .resolves.toBeNull();
  });

  it('consulta promociones activas y vigentes para los productos y la sucursal de la venta', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id_promocion: 3, id_producto: 1 }],
      }),
    };

    await expect(
      PromocionDAO.obtenerVigentesParaVenta([1, 2], 4, client),
    ).resolves.toEqual([{ id_promocion: 3, id_producto: 1 }]);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /id_producto = ANY[\s\S]*id_sucursal = \$2[\s\S]*activo = TRUE[\s\S]*CURRENT_DATE >= fecha_inicio[\s\S]*fecha_fin IS NULL OR CURRENT_DATE <= fecha_fin[\s\S]*FOR UPDATE/,
      ),
      [[1, 2], 4],
    );
  });

  it('no consulta la base si la venta no contiene productos', async () => {
    const client = { query: jest.fn() };

    await expect(PromocionDAO.obtenerVigentesParaVenta([], 1, client)).resolves.toEqual([]);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('detecta solapamiento sin excluir ningún id', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_promocion: 7, nombre: 'Mayoreo' }] });

    await expect(PromocionDAO.existeActivaSolapada({
      id_producto: 1,
      id_sucursal: 1,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-01-31',
    })).resolves.toEqual({ id_promocion: 7, nombre: 'Mayoreo' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.not.stringContaining('id_promocion <>'),
      [1, 1, '2026-01-01', '2026-01-31'],
    );
  });

  it('excluye el propio id al validar solapamiento en una edición', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(PromocionDAO.existeActivaSolapada({
      id_producto: 1,
      id_sucursal: 1,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-01-31',
      excluir_id: 5,
    })).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('id_promocion <>'),
      [1, 1, '2026-01-01', '2026-01-31', 5],
    );
  });

  it('actualiza los campos enviados', async () => {
    const fila = { id_promocion: 1, cantidad_minima: 10 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(
      PromocionDAO.actualizar(1, { cantidad_minima: 10 }),
    ).resolves.toEqual(fila);
  });

  it('cambia el estado activo de la promoción', async () => {
    const fila = { id_promocion: 1, activo: false };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(PromocionDAO.cambiarActivo(1, false)).resolves.toEqual(fila);
  });

  it('elimina una promoción', async () => {
    const fila = { id_promocion: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(PromocionDAO.eliminar(1)).resolves.toEqual(fila);
  });
});
