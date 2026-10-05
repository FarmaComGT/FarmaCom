const CAMPOS_BUSQUEDA = [
  'codigo',
  'nombre_comercial',
  'nombre_generico',
  'concentracion',
  'presentacion',
];

const normalizarTexto = (valor) => String(valor ?? '')
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');

const normalizarFoneticamente = (valor) => normalizarTexto(valor)
  // Se usan marcadores para no convertir la g fuerte ni la ch en reglas posteriores.
  .replace(/gu(?=[ei])/g, 'G')
  .replace(/ch/g, 'C')
  .replace(/^hi(?=[aeou])/g, 'y')
  .replace(/h/g, '')
  .replace(/ll/g, 'y')
  .replace(/qu/g, 'k')
  .replace(/g(?=[ei])/g, 'j')
  .replace(/c(?=[ei])/g, 's')
  .replace(/[z]/g, 's')
  .replace(/[cqk]/g, 'k')
  .replace(/v/g, 'b')
  .replace(/G/g, 'g')
  .replace(/C/g, 'ch');

const calcularDistanciaDamerauLevenshtein = (primerValor, segundoValor) => {
  const primero = Array.from(String(primerValor ?? ''));
  const segundo = Array.from(String(segundoValor ?? ''));

  if (primero.length === 0) return segundo.length;
  if (segundo.length === 0) return primero.length;

  const distanciaMaxima = primero.length + segundo.length;
  const matriz = Array.from(
    { length: primero.length + 2 },
    () => Array(segundo.length + 2).fill(0),
  );
  const ultimaFilaPorCaracter = new Map();

  matriz[0][0] = distanciaMaxima;
  for (let fila = 0; fila <= primero.length; fila += 1) {
    matriz[fila + 1][0] = distanciaMaxima;
    matriz[fila + 1][1] = fila;
  }
  for (let columna = 0; columna <= segundo.length; columna += 1) {
    matriz[0][columna + 1] = distanciaMaxima;
    matriz[1][columna + 1] = columna;
  }

  for (let fila = 1; fila <= primero.length; fila += 1) {
    let ultimaColumnaCoincidente = 0;

    for (let columna = 1; columna <= segundo.length; columna += 1) {
      const filaCaracterAnterior = ultimaFilaPorCaracter.get(segundo[columna - 1]) ?? 0;
      const columnaCaracterAnterior = ultimaColumnaCoincidente;
      let costoSustitucion = 1;

      if (primero[fila - 1] === segundo[columna - 1]) {
        costoSustitucion = 0;
        ultimaColumnaCoincidente = columna;
      }

      matriz[fila + 1][columna + 1] = Math.min(
        matriz[fila][columna] + costoSustitucion,
        matriz[fila + 1][columna] + 1,
        matriz[fila][columna + 1] + 1,
        matriz[filaCaracterAnterior][columnaCaracterAnterior]
          + (fila - filaCaracterAnterior - 1)
          + 1
          + (columna - columnaCaracterAnterior - 1),
      );
    }

    ultimaFilaPorCaracter.set(primero[fila - 1], fila);
  }

  return matriz[primero.length + 1][segundo.length + 1];
};

const obtenerUmbralDistancia = (termino) => {
  const longitud = normalizarTexto(termino).length;
  if (longitud === 0) return 0;
  if (longitud <= 4) return 1;
  if (longitud <= 8) return 2;
  return 3;
};

const obtenerVariantesCandidato = (candidato) => {
  const valores = CAMPOS_BUSQUEDA
    .map((campo) => candidato[campo])
    .filter((valor) => valor !== null && valor !== undefined && String(valor).trim() !== '');
  const combinaciones = [
    [candidato.nombre_comercial, candidato.concentracion, candidato.presentacion],
    [candidato.nombre_generico, candidato.concentracion, candidato.presentacion],
  ]
    .map((partes) => partes.filter(Boolean).join(' '))
    .filter(Boolean);

  return [...new Set([...valores, ...combinaciones].flatMap((valor) => [
    valor,
    ...String(valor).split(/[^\p{L}\p{N}]+/u),
  ]))]
    .map(normalizarFoneticamente)
    .filter(Boolean);
};

const calcularDistanciaCandidato = (terminoNormalizado, candidato) => {
  const variantes = obtenerVariantesCandidato(candidato);
  if (variantes.length === 0) return Number.POSITIVE_INFINITY;

  return Math.min(...variantes.map((variante) => (
    calcularDistanciaDamerauLevenshtein(terminoNormalizado, variante)
  )));
};

const reordenarCandidatos = (candidatos, termino, limite) => {
  if (!Array.isArray(candidatos) || candidatos.length === 0) return [];

  const terminoNormalizado = normalizarFoneticamente(termino);
  const umbral = obtenerUmbralDistancia(termino);
  const productosAgrupados = new Map();

  candidatos.forEach((candidato, indice) => {
    const clave = candidato.id_producto ?? `sin-id-${indice}`;
    if (!productosAgrupados.has(clave)) {
      const esAproximada = candidato.tipo_coincidencia === 'aproximada';
      productosAgrupados.set(clave, {
        filas: [],
        indice,
        esAproximada,
        distancia: esAproximada
          ? calcularDistanciaCandidato(terminoNormalizado, candidato)
          : 0,
        relevancia: Number(candidato.relevancia) || 0,
        nombre: normalizarTexto(candidato.nombre_comercial),
      });
    }
    productosAgrupados.get(clave).filas.push(candidato);
  });

  const cantidadMaxima = Number.isInteger(limite) && limite > 0
    ? limite
    : productosAgrupados.size;

  return [...productosAgrupados.values()]
    .filter((producto) => !producto.esAproximada || producto.distancia <= umbral)
    .sort((primero, segundo) => {
      if (primero.esAproximada !== segundo.esAproximada) {
        return primero.esAproximada ? 1 : -1;
      }
      if (!primero.esAproximada) return primero.indice - segundo.indice;
      if (primero.distancia !== segundo.distancia) {
        return primero.distancia - segundo.distancia;
      }
      if (primero.relevancia !== segundo.relevancia) {
        return segundo.relevancia - primero.relevancia;
      }

      return primero.nombre.localeCompare(segundo.nombre, 'es')
        || primero.indice - segundo.indice;
    })
    .slice(0, cantidadMaxima)
    .flatMap((producto) => producto.filas);
};

module.exports = {
  normalizarTexto,
  normalizarFoneticamente,
  calcularDistanciaDamerauLevenshtein,
  obtenerUmbralDistancia,
  reordenarCandidatos,
};
