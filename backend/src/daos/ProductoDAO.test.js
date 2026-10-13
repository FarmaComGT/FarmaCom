jest.mock('../database/db');

const pool = require('../database/db');
const ProductoDAO = require('./ProductoDAO');

describe('ProductoDAO - concentración opcional', () => {
  beforeEach(() => jest.clearAllMocks());

  it('compara concentraciones nulas como parte de la identidad', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await ProductoDAO.obtenerPorIdentidad({
      nombre_generico: 'Termómetro',
      concentracion: null,
      id_casa: 2,
      id_presentacion: 3,
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("COALESCE(LOWER(TRIM(concentracion)), '')"),
      ['Termómetro', null, 2, 3],
    );
  });

  it('permite establecer explícitamente la concentración en null', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_producto: 7, concentracion: null }] });

    await ProductoDAO.actualizar(7, { concentracion: null });

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('concentracion            = CASE WHEN $14 THEN $4 ELSE concentracion END');
    expect(consulta).toContain('WHERE id_producto = $15');
    expect(valores[3]).toBeNull();
    expect(valores[13]).toBe(true);
    expect(valores[14]).toBe(7);
  });

  it('no modifica la concentración cuando el campo se omite', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_producto: 7, concentracion: '500 mg' }] });

    await ProductoDAO.actualizar(7, { nombre_comercial: 'Producto actualizado' });

    const valores = pool.query.mock.calls[0][1];
    expect(valores[13]).toBe(false);
  });
});

describe('ProductoDAO - autocompletado para POS', () => {
  beforeEach(() => jest.clearAllMocks());

  it('filtra productos y selecciona un lote vendible de la sucursal', async () => {
    pool.query.mockResolvedValue({ rows: [
      { id_producto: 3, id_lote: 9 },
      { id_producto: 3, id_lote: 10 },
    ] });

    const resultado = await ProductoDAO.autocompletarParaPOS('Pará_50%', 2, 8);

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('p.activo = TRUE');
    expect(consulta).toContain('normalizar_texto_busqueda');
    expect(consulta).toContain('similarity(');
    expect(consulta).toContain("set_config('pg_trgm.similarity_threshold', $4, TRUE)");
    expect(consulta).toContain('codigo_normalizado % termino_normalizado');
    expect(consulta).toContain('char_length(termino_normalizado) >= 3');
    expect(consulta).not.toContain('relevancia >= 0.30');
    expect(consulta).toContain('l.id_sucursal = $2');
    expect(consulta).toContain('l.stock_actual > 0');
    expect(consulta).toContain('l.precio_venta > 0');
    expect(consulta).toContain('l.fecha_vencimiento >= CURRENT_DATE');
    expect(consulta).toContain('FROM productos_limitados p');
    expect(consulta).toContain('JOIN v_lote_estado lote_pos');
    expect(consulta).toContain('lote_pos.estado_vencimiento');
    expect(consulta).toContain('lote_pos.fecha_vencimiento ASC');
    expect(consulta).toContain('LIMIT $3');
    expect(consulta).not.toContain('JOIN LATERAL');
    expect(consulta).not.toContain('LIMIT 1');
    expect(valores).toEqual(['Pará_50%', 2, 40, '0.1']);
    expect(resultado).toEqual([
      { id_producto: 3, id_lote: 9 },
      { id_producto: 3, id_lote: 10 },
    ]);
  });

  it('reordena los candidatos aproximados con Damerau-Levenshtein', async () => {
    pool.query.mockResolvedValue({ rows: [
      {
        id_producto: 1,
        id_lote: 10,
        nombre_comercial: 'Acetaminofem',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.85',
      },
      {
        id_producto: 2,
        id_lote: 20,
        nombre_comercial: 'Acetaminofén',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.70',
      },
    ] });

    const resultado = await ProductoDAO.autocompletarParaPOS('acetaminofne', 2, 8);

    expect(resultado.map(({ id_producto }) => id_producto)).toEqual([2, 1]);
    expect(resultado[0]).toEqual(expect.objectContaining({
      tipo_coincidencia: 'aproximada',
      relevancia: '0.70',
    }));
  });

  it('acepta Tylenol cuando la búsqueda tilenal tiene dos sustituciones', async () => {
    pool.query.mockResolvedValue({ rows: [
      {
        id_producto: 1,
        id_lote: 10,
        codigo: 'MED001-UN',
        nombre_comercial: 'Tylenol',
        nombre_generico: 'Paracetamol',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.142857',
      },
    ] });

    const resultado = await ProductoDAO.autocompletarParaPOS('tilenal', 1, 8);

    expect(resultado).toEqual([
      expect.objectContaining({
        nombre_comercial: 'Tylenol',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.142857',
      }),
    ]);
  });
});
