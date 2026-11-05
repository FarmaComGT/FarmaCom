import api from './axios';

const base = '/reportes/resumen-diario';
export const obtenerConfiguracion = async (signal) => (await api.get(`${base}/configuracion`, { signal })).data;
export const guardarConfiguracion = async (datos) => (await api.put(`${base}/configuracion`, datos)).data;
export const obtenerVistaPrevia = async (fecha, config, signal) => (await api.get(base, {
  signal, params: { fecha, ...(!config.todas_sucursales ? { sucursales: config.sucursales.join(',') } : {}) },
})).data;
export const obtenerHistorial = async (pagina, limite, signal) => (await api.get(`${base}/historial`, { params: { pagina, limite }, signal })).data;
export const crearCorte = async (fecha) => (await api.post(`${base}/historial`, { fecha })).data;
export const enviarCorte = async (id) => (await api.post(`${base}/historial/${id}/enviar`, {})).data;
export const obtenerEnvios = async (id, signal) => (await api.get(`${base}/historial/${id}/envios`, { signal })).data;
export const descargarCorte = async (id) => {
  const { data } = await api.get(`${base}/historial/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const enlace = document.createElement('a');
  enlace.href = url; enlace.download = `resumen-ventas-${id}.pdf`;
  document.body.appendChild(enlace); enlace.click(); enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const mensajeError = async (error, defecto) => {
  if (error.response?.data instanceof Blob) {
    try { return JSON.parse(await error.response.data.text()).mensaje || defecto; } catch { return defecto; }
  }
  return error.response?.data?.mensaje || defecto;
};
