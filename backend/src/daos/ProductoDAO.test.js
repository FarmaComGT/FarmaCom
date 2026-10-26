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
    expect(consulta).toContain('concentracion            = CASE WHEN $13 THEN $4 ELSE concentracion END');
    expect(consulta).toContain('WHERE id_producto = $14');
    expect(valores[3]).toBeNull();
    expect(valores[12]).toBe(true);
    expect(valores[13]).toBe(7);
  });

  it('no modifica la concentración cuando el campo se omite', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_producto: 7, concentracion: '500 mg' }] });

    await ProductoDAO.actualizar(7, { nombre_comercial: 'Producto actualizado' });

    const valores = pool.query.mock.calls[0][1];
    expect(valores[12]).toBe(false);
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
    expect(consulta).toContain('l.fecha_vencimiento IS NULL');
    expect(consulta).toContain('l.fecha_vencimiento >= CURRENT_DATE');
    expect(consulta).toContain('FROM productos_limitados p');
    expect(consulta).toContain('JOIN v_lote_estado lote_pos');
    expect(consulta).toContain('lote_pos.estado_vencimiento');
    expect(consulta).toContain('lote_pos.numero_lote ASC');
    expect(consulta).not.toContain('lote_pos.fecha_vencimiento ASC');
    expect(consulta).toContain('LIMIT $3');
    expect(consulta).toContain('LEFT JOIN LATERAL');
    expect(consulta).toContain('CURRENT_DATE BETWEEN pr.fecha_inicio AND pr.fecha_fin');
    expect(consulta).toContain('pr.id_sucursal = $2');
    expect(consulta).toContain('pr.activo = TRUE');
    expect(consulta).toContain('pr.precio_promocion < lote_pos.precio_venta');
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

describe('ProductoDAO - catálogo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('crea un producto aplicando los valores por defecto', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_producto: 10 }] });

    await expect(ProductoDAO.crear({
      codigo: 'MED-010',
      nombre_comercial: 'Dolofin',
      nombre_generico: 'Ibuprofeno',
      id_presentacion: 2,
      id_categoria: 3,
      id_casa: 4,
      meses_alerta_vencimiento: 6,
    })).resolves.toEqual({ id_producto: 10 });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO producto'),
      ['MED-010', 'Dolofin', 'Ibuprofeno', null, 2, null, 3, 4, null, 5, 6, false],
    );
  });

  it('respeta los valores opcionales enviados al crear', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_producto: 11 }] });

    await ProductoDAO.crear({
      codigo: 'MED-011',
      nombre_comercial: 'Amoxil',
      nombre_generico: 'Amoxicilina',
      concentracion: '500 mg',
      id_presentacion: 2,
      descripcion: 'Cápsulas',
      id_categoria: 3,
      id_casa: 4,
      id_proveedor: 7,
      stock_minimo: 10,
      meses_alerta_vencimiento: 3,
      aplica_mayoreo: true,
    });

    expect(pool.query.mock.calls[0][1]).toEqual([
      'MED-011', 'Amoxil', 'Amoxicilina', '500 mg', 2, 'Cápsulas', 3, 4, 7, 10, 3, true,
    ]);
  });

  it('lista todos los productos con sus catálogos relacionados', async () => {
    pool.query.mockResolvedValue({ rows: [{ id_producto: 1 }] });

    await expect(ProductoDAO.obtenerTodos()).resolves.toEqual([{ id_producto: 1 }]);
    expect(pool.query.mock.calls[0][0]).toContain('LEFT JOIN proveedor');
  });

  it('obtiene un producto por id con la conexión indicada', async () => {
    const clienteFalso = { query: jest.fn().mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
      .mockResolvedValueOnce({ rows: [] }) };

    await expect(ProductoDAO.obtenerPorId(1, clienteFalso)).resolves.toEqual({ id_producto: 1 });
    await expect(ProductoDAO.obtenerPorId(99, clienteFalso)).resolves.toBeNull();
    expect(clienteFalso.query).toHaveBeenCalledWith(expect.stringContaining('WHERE p.id_producto = $1'), [1]);
  });

  it('busca por código sin distinguir mayúsculas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_producto: 1 }] }).mockResolvedValueOnce({ rows: [] });

    await expect(ProductoDAO.obtenerPorCodigo('med-001')).resolves.toEqual({ id_producto: 1 });
    await expect(ProductoDAO.obtenerPorCodigo('NO-EXISTE')).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('LOWER(codigo) = LOWER($1)'), ['med-001']);
  });

  it.each([
    ['cambiarAplicaMayoreo', 'aplica_mayoreo', true],
    ['cambiarActivo', 'activo', false],
  ])('%s actualiza %s y devuelve null si el producto no existe', async (metodo, columna, valor) => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_producto: 1, [columna]: valor }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(ProductoDAO[metodo](1, valor)).resolves.toEqual({ id_producto: 1, [columna]: valor });
    await expect(ProductoDAO[metodo](99, valor)).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining(`SET ${columna} = $1`), [valor, 1]);
  });
});
