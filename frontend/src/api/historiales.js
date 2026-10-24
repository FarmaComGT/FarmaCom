import api from './axios';

export const obtenerHistorialExpediente = async (idExpediente) => {
  const { data } = await api.get(`/expedientes/${idExpediente}/bitacora`);
  return data;
};

export const obtenerHistorialPreciosProducto = async (idProducto) => {
  const { data } = await api.get(`/productos/${idProducto}/historial-precios`);
  return data;
};
