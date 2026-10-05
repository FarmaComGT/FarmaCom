const {
  normalizarFoneticamente,
  calcularDistanciaDamerauLevenshtein,
  obtenerUmbralDistancia,
  reordenarCandidatos,
} = require('./busquedaTolerante');

describe('búsqueda tolerante', () => {
  it.each([
    ['transposición', 'acetaminofne', 'acetaminofen'],
    ['omisión', 'acetaminofe', 'acetaminofen'],
    ['inserción', 'acetaminofenn', 'acetaminofen'],
    ['sustitución', 'acetaminofem', 'acetaminofen'],
  ])('cuenta una edición por %s', (tipo, primero, segundo) => {
    expect(calcularDistanciaDamerauLevenshtein(primero, segundo)).toBe(1);
  });

  it.each([
    ['Bismuto', 'Vismuto'],
    ['Cereza', 'Seresa'],
    ['Queso', 'Keso'],
    ['Jirafa', 'Girafa'],
    ['Llave', 'Yave'],
  ])('iguala errores fonéticos entre "%s" y "%s"', (correcto, variante) => {
    expect(normalizarFoneticamente(correcto)).toBe(normalizarFoneticamente(variante));
  });

  it.each([
    ['sol', 1],
    ['casa', 1],
    ['bismuto', 2],
    ['vitaminaa', 3],
  ])('asigna el umbral correspondiente a "%s"', (termino, umbral) => {
    expect(obtenerUmbralDistancia(termino)).toBe(umbral);
  });

  it('prioriza coincidencias directas y conserva juntos los lotes del producto', () => {
    const candidatos = [
      {
        id_producto: 2,
        id_lote: 20,
        nombre_comercial: 'Acetaminofem',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.80',
      },
      {
        id_producto: 1,
        id_lote: 10,
        nombre_comercial: 'Acetaminofén',
        tipo_coincidencia: 'exacta',
        relevancia: '1',
      },
      {
        id_producto: 2,
        id_lote: 21,
        nombre_comercial: 'Acetaminofem',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.80',
      },
    ];

    const resultado = reordenarCandidatos(candidatos, 'acetaminofen', 2);

    expect(resultado.map(({ id_lote }) => id_lote)).toEqual([10, 20, 21]);
    expect(resultado[1]).toEqual(expect.objectContaining({
      tipo_coincidencia: 'aproximada',
      relevancia: '0.80',
    }));
  });

  it('descarta coincidencias aproximadas que superan el umbral', () => {
    const candidatos = [
      {
        id_producto: 1,
        nombre_comercial: 'Acetaminofén',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.70',
      },
      {
        id_producto: 2,
        nombre_comercial: 'Azitromicina',
        tipo_coincidencia: 'aproximada',
        relevancia: '0.35',
      },
    ];

    expect(reordenarCandidatos(candidatos, 'acetaminofne', 10)).toEqual([
      candidatos[0],
    ]);
  });
});
