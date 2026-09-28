import api from './axios';

export const listarLaboratorios = async () => {
  const { data } = await api.get('/laboratorios');
  return data;
};

export const crearLaboratorio = async (datos) => {
  const { data } = await api.post('/laboratorios', datos);
  return data;
};

export const actualizarLaboratorio = async (id, datos) => {
  const { data } = await api.put(`/laboratorios/${id}`, datos);
  return data;
};
