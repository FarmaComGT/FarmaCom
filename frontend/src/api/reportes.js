import api from './axios';
import {
  normalizarRentabilidad,
  normalizarMetodosPago,
  normalizarResumenVentas,
  normalizarSerieVentas,
  normalizarTopProductos,
} from '../utils/reportes';

const FILTROS_COMUNES = ['id_sucursal', 'fecha_desde', 'fecha_hasta'];

export const obtenerRentabilidad = async (filtros = {}, opciones = {}) => {
  const { data } = await api.get(
    '/reportes/rentabilidad',
    construirConfiguracion(filtros, FILTROS_COMUNES, opciones.signal),
  );
  return normalizarRentabilidad(data);
};

export const construirParametrosReporte = (filtros = {}, campos = FILTROS_COMUNES) => (
  campos.reduce((parametros, campo) => {
    const valor = filtros[campo];

    if (valor !== undefined && valor !== null && valor !== '') {
      parametros[campo] = valor;
    }

    return parametros;
  }, {})
);

const construirConfiguracion = (filtros, campos, signal) => ({
  params: construirParametrosReporte(filtros, campos),
  ...(signal ? { signal } : {}),
});

export const obtenerResumenVentas = async (filtros = {}, opciones = {}) => {
  const { data } = await api.get(
    '/reportes/ventas/resumen',
    construirConfiguracion(filtros, FILTROS_COMUNES, opciones.signal),
  );

  return normalizarResumenVentas(data);
};

export const obtenerSerieVentas = async (filtros = {}, opciones = {}) => {
  const { data } = await api.get(
    '/reportes/ventas/serie',
    construirConfiguracion(
      filtros,
      [...FILTROS_COMUNES, 'agrupacion'],
      opciones.signal,
    ),
  );

  return normalizarSerieVentas(data);
};

export const obtenerMetodosPago = async (filtros = {}, opciones = {}) => {
  const { data } = await api.get(
    '/reportes/ventas/metodos-pago',
    construirConfiguracion(filtros, FILTROS_COMUNES, opciones.signal),
  );

  return normalizarMetodosPago(data);
};

export const obtenerTopProductos = async (filtros = {}, opciones = {}) => {
  const { data } = await api.get(
    '/reportes/productos/top',
    construirConfiguracion(
      filtros,
      [...FILTROS_COMUNES, 'limite', 'criterio'],
      opciones.signal,
    ),
  );

  return normalizarTopProductos(data);
};
