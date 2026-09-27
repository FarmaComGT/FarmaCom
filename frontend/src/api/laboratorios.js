import api from './axios';

export const listarLaboratorios = async () => {
  const { data } = await api.get('/laboratorios');
  return data;
};
