const normalizarCaracter = (caracter) => caracter
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

const construirIndiceNormalizado = (valor) => {
  const originales = Array.from(String(valor ?? ''));
  const caracteres = [];
  const posiciones = [];

  originales.forEach((caracter, posicion) => {
    Array.from(normalizarCaracter(caracter)).forEach((normalizado) => {
      caracteres.push(normalizado);
      posiciones.push(posicion);
    });
  });

  return { originales, caracteres, posiciones };
};

export const obtenerPartesCoincidentes = (texto, busqueda) => {
  const textoIndexado = construirIndiceNormalizado(texto);
  const busquedaNormalizada = construirIndiceNormalizado(busqueda).caracteres;

  if (textoIndexado.caracteres.length === 0 || busquedaNormalizada.length === 0) {
    return null;
  }

  const filaAnterior = Array(busquedaNormalizada.length + 1).fill(0);
  let mejorLongitud = 0;
  let mejorFinalTexto = 0;

  for (let indiceTexto = 1; indiceTexto <= textoIndexado.caracteres.length; indiceTexto += 1) {
    let diagonalAnterior = 0;

    for (
      let indiceBusqueda = 1;
      indiceBusqueda <= busquedaNormalizada.length;
      indiceBusqueda += 1
    ) {
      const valorAnterior = filaAnterior[indiceBusqueda];

      if (
        textoIndexado.caracteres[indiceTexto - 1]
        === busquedaNormalizada[indiceBusqueda - 1]
      ) {
        filaAnterior[indiceBusqueda] = diagonalAnterior + 1;
        if (filaAnterior[indiceBusqueda] > mejorLongitud) {
          mejorLongitud = filaAnterior[indiceBusqueda];
          mejorFinalTexto = indiceTexto;
        }
      } else {
        filaAnterior[indiceBusqueda] = 0;
      }

      diagonalAnterior = valorAnterior;
    }
  }

  const minimoCoincidente = busquedaNormalizada.length <= 2
    ? busquedaNormalizada.length
    : 2;
  if (mejorLongitud < minimoCoincidente) return null;

  const inicioNormalizado = mejorFinalTexto - mejorLongitud;
  const inicioOriginal = textoIndexado.posiciones[inicioNormalizado];
  const finalOriginal = textoIndexado.posiciones[mejorFinalTexto - 1] + 1;

  return {
    antes: textoIndexado.originales.slice(0, inicioOriginal).join(''),
    coincidencia: textoIndexado.originales.slice(inicioOriginal, finalOriginal).join(''),
    despues: textoIndexado.originales.slice(finalOriginal).join(''),
  };
};

export const obtenerTextoMasCoincidente = (opciones, busqueda) => {
  const textos = opciones.filter((opcion) => typeof opcion === 'string' && opcion.trim());
  if (textos.length === 0) return null;

  return textos.reduce((mejor, texto) => {
    const partes = obtenerPartesCoincidentes(texto, busqueda);
    const longitud = partes?.coincidencia.length ?? 0;

    return longitud > mejor.longitud ? { texto, longitud } : mejor;
  }, { texto: textos[0], longitud: 0 }).texto;
};
