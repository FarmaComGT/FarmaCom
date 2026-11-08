import api from './axios';
import { agruparLotesPorProductoPOS, normalizarProductoPOS } from '../utils/pos';

// Punto de entrada compartido por teclado USB, cámara local y celular remoto.
export async function buscarProductoPorLectura(codigo, { signal } = {}) {
  const respuesta = await api.get('/productos/lectura', { params: { codigo }, signal });
  const productos = agruparLotesPorProductoPOS(respuesta.data).map(normalizarProductoPOS);
  if (productos.length !== 1 || !productos[0].tiene_precio) {
    throw new Error('No se pudo identificar un único producto vendible. Revisa el catálogo.');
  }
  return productos[0];
}
