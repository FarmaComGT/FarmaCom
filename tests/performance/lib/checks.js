import { check } from 'k6';

export const comprobarRespuestaJson = (respuesta, nombre, estadoEsperado = 200) => check(respuesta, {
  [`${nombre}: estado ${estadoEsperado}`]: (resultado) => resultado.status === estadoEsperado,
  [`${nombre}: respuesta JSON`]: (resultado) => {
    const tipoContenido = resultado.headers['Content-Type'] || '';
    return tipoContenido.toLowerCase().includes('application/json');
  },
});

export const comprobarArregloJson = (respuesta, nombre) => check(respuesta, {
  [`${nombre}: devuelve un arreglo`]: (resultado) => {
    try {
      return Array.isArray(resultado.json());
    } catch (_error) {
      return false;
    }
  },
});

export const comprobarObjetoJson = (respuesta, nombre) => check(respuesta, {
  [`${nombre}: devuelve un objeto`]: (resultado) => {
    try {
      const contenido = resultado.json();
      return contenido !== null && typeof contenido === 'object' && !Array.isArray(contenido);
    } catch (_error) {
      return false;
    }
  },
});
