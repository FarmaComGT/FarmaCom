import api from './axios';
import { normalizarVentas } from '../utils/ventas';

const CAMPOS_FILTRO = ['id_sucursal', 'estado', 'fecha_desde', 'fecha_hasta'];

const construirParametros = (filtros = {}) => CAMPOS_FILTRO.reduce((parametros, campo) => {
  const valor = filtros[campo];
  if (valor !== undefined && valor !== null && valor !== '') parametros[campo] = valor;
  return parametros;
}, {});

export const obtenerVentas = async (filtros = {}, opciones = {}) => {
  try {
    const { data } = await api.get('/ventas', {
      params: construirParametros(filtros),
      ...(opciones.signal ? { signal: opciones.signal } : {}),
    });
    return normalizarVentas(data);
  } catch (err) {
    const mensaje = err.response?.data?.mensaje || 'No se pudo cargar el historial de ventas.';
    throw new Error(mensaje);
  }
};

export const crearVenta = async (payload) => {
  try {
    const { data } = await api.post('/ventas', payload);
    return data;
  } catch (err) {
    const mensaje = err.response?.data?.mensaje || 'No se pudo registrar la venta.';
    throw new Error(mensaje);
  }
};

export const crearPagoPOS = async (payload) => {
  try {
    const { data } = await api.post('/ventas/tarjeta/pos', payload);
    return data;
  } catch (err) {
    const mensajeBackend = err.response?.data?.mensaje || '';
    const mensaje = /modo espera|no est[aá] listo|terminal_not_in_standby/i.test(mensajeBackend)
      ? 'El dispositivo no está listo para cobrar. Verifica que esté abierto e inténtalo de nuevo.'
      : /m[ií]nimo.*Q?5|Q5\.00/i.test(mensajeBackend)
        ? 'El monto mínimo para pagar con tarjeta es Q5.00.'
        : 'No se pudo iniciar el pago. Inténtalo de nuevo.';
    throw new Error(mensaje);
  }
};

export const obtenerEstadoPagoPOS = async (externalId) => {
  try {
    const { data } = await api.get(`/ventas/tarjeta/pos/${encodeURIComponent(externalId)}`);
    return data;
  } catch (err) {
    const mensaje = err.response?.data?.mensaje || 'No se pudo verificar el estado del pago.';
    throw new Error(mensaje);
  }
};

export const obtenerVentaPorId = async (idVenta) => {
  try {
    const { data } = await api.get(`/ventas/${idVenta}`);
    return data;
  } catch (err) {
    const mensaje = err.response?.data?.mensaje || 'No se pudo cargar el comprobante de la venta.';
    throw new Error(mensaje);
  }
};
