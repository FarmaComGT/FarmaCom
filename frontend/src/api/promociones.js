import api from './axios';

export const obtenerPromocionesProducto = async (idProducto, opciones = {}) => {
  const { data } = await api.get(`/productos/${idProducto}/promociones`, {
    signal: opciones.signal,
  });
  return data;
};

export const crearPromocion = async (idProducto, datos) => {
  const { data } = await api.post(`/productos/${idProducto}/promociones`, datos);
  return data;
};

export const actualizarPromocion = async (idPromocion, datos) => {
  const { data } = await api.put(`/promociones/${idPromocion}`, datos);
  return data;
};

export const cambiarEstadoPromocion = async (idPromocion, activo) => {
  const { data } = await api.patch(`/promociones/${idPromocion}/estado`, { activo });
  return data;
};
