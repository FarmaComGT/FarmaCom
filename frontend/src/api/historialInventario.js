import api from './axios';

export const obtenerHistorialInventario = async (params) => {
  const { data } = await api.get('/inventario/historial', { params });
  return data;
};
