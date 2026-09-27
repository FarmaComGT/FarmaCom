import api from './axios';

export const listarResultados = async (idPaciente) => {
  const { data } = await api.get('/resultados-laboratorio', { params: { id_paciente: idPaciente } });
  return data;
};

export const subirResultado = async ({ idPaciente, categoria, archivo }) => {
  const formData = new FormData();
  formData.append('id_paciente', idPaciente);
  formData.append('categoria', categoria);
  formData.append('archivo', archivo);

  const { data } = await api.post('/resultados-laboratorio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const anularResultado = async (id, motivo_anulacion) => {
  const { data } = await api.patch(`/resultados-laboratorio/${id}/anular`, { motivo_anulacion });
  return data;
};

export const obtenerCategoriasSugeridas = async (idLaboratorio) => {
  const { data } = await api.get('/resultados-laboratorio/categorias', {
    params: { id_laboratorio: idLaboratorio },
  });
  return data;
};

const BASE_URL_API = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export const construirUrlPublica = (token) => `${BASE_URL_API}/resultados-laboratorio/publico/${token}`;
