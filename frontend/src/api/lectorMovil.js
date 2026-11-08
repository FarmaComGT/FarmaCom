import api from './axios';

const raiz = '/lector-movil';
export const crearVinculacion = async (destino) => (await api.post(`${raiz}/sesiones`, { destino })).data;
export const pulsoVinculacion = async (id, disponible, signal, contexto, destino) => (await api.post(`${raiz}/sesiones/${id}/pulso`, { disponible, contexto, destino }, { signal })).data;
export const confirmarVinculacion = async (id) => (await api.post(`${raiz}/sesiones/${id}/confirmar`, {})).data;
export const acusarLectura = async (id, lecturaId) => (await api.post(`${raiz}/sesiones/${id}/acuse`, { id: lecturaId })).data;
export const revocarVinculacion = async (id) => api.delete(`${raiz}/sesiones/${id}`, { data: {}, skipAuthHandling: true });

// En producción se omiten cookies. La compilación local puede conservar las
// cookies del túnel privado, exclusivamente para solicitudes al mismo origen.
// Las rutas móviles siempre autentican la credencial Bearer, no esas cookies.
export async function solicitudMovil(id, token, accion, { method = 'GET', body, signal } = {}) {
  const base = new URL(import.meta.env.VITE_API_URL || '/api', window.location.origin);
  if (base.protocol !== 'https:') throw new Error('El lector móvil necesita una conexión HTTPS a FarmaCom.');
  const tunelPrivado = import.meta.env.VITE_LECTOR_TUNEL_PRIVADO === 'true';
  if (tunelPrivado && base.origin !== window.location.origin) throw new Error('La prueba con túnel privado requiere abrir la aplicación y la API desde la misma dirección HTTPS.');
  const respuesta = await fetch(`${base.href.replace(/\/$/, '')}/lector-movil/movil/${encodeURIComponent(id)}${accion ? `/${accion}` : ''}`, {
    method, signal, credentials: tunelPrivado ? 'same-origin' : 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}),
  });
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json();
  if (!respuesta.ok) throw Object.assign(new Error(datos.mensaje || 'No se pudo conectar con el lector.'), { status: respuesta.status });
  return datos;
}
