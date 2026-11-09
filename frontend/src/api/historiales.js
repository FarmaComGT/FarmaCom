import api from './axios';

export const obtenerHistorialPreciosProducto = async (idProducto) => {
  const { data } = await api.get(`/productos/${idProducto}/historial-precios`);
  return data;
};
