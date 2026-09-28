jest.mock('../database/db');

const pool = require('../database/db');
const PromocionDAO = require('./PromocionDAO');

describe('PromocionDAO', () => {
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

  it('detecta solapamiento sin excluir ningún id', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    await expect(PromocionDAO.existeActivaSolapada({
      id_producto: 1,
      id_sucursal: 1,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-01-31',
    })).resolves.toBe(true);
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
    })).resolves.toBe(false);
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
