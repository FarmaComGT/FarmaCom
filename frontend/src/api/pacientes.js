import api from './axios';

export const buscarPacientes = async (params) => {
  const { data } = await api.get('/pacientes', { params });
  return data;
};

export const obtenerPaciente = async (id) => {
  const { data } = await api.get(`/pacientes/${id}`);
  return data;
};

export const crearPaciente = async (datos) => {
  const { data } = await api.post('/pacientes', datos);
  return data;
};

export const actualizarPaciente = async (id, datos) => {
  const { data } = await api.put(`/pacientes/${id}`, datos);
  return data;
};

export const anularPaciente = async (id, motivo_anulacion) => {
  const { data } = await api.patch(`/pacientes/${id}/anular`, { motivo_anulacion });
  return data;
};
