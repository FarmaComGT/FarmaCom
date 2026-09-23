import api from './axios';

const CAMPOS_CAJAS = ['id_sucursal', 'activa'];
const CAMPOS_CIERRES = [
  'id_sucursal',
  'id_caja',
  'fecha_desde',
  'fecha_hasta',
];
const CAMPOS_RESUMEN = ['fecha', 'id_sucursal'];

export const construirParametrosCaja = (filtros = {}, campos = []) => (
  campos.reduce((parametros, campo) => {
    const valor = filtros[campo];

    if (valor !== undefined && valor !== null && valor !== '') {
      parametros[campo] = valor;
    }

    return parametros;
  }, {})
);

const construirConfiguracion = (filtros, campos, signal) => ({
  params: construirParametrosCaja(filtros, campos),
  ...(signal ? { signal } : {}),
});

export const obtenerCajas = async (filtros = {}, opciones = {}) => {
  const { data } = await api.get(
    '/cajas',
    construirConfiguracion(filtros, CAMPOS_CAJAS, opciones.signal),
  );

  return data;
};

export const obtenerSesionActual = async (idCaja, opciones = {}) => {
  const configuracion = opciones.signal ? { signal: opciones.signal } : undefined;
  const { data } = await api.get(
    `/cajas/${idCaja}/sesion-actual`,
    configuracion,
  );

  return data;
};

export const abrirSesion = async (idCaja, datos) => {
  const { data } = await api.post(`/cajas/${idCaja}/sesiones`, datos);
  return data;
};

export const registrarMovimiento = async (idSesion, datos) => {
  const { data } = await api.post(
    `/cajas/sesiones/${idSesion}/movimientos`,
    datos,
  );
  return data;
};

export const cerrarSesion = async (idSesion, datos) => {
  const { data } = await api.post(
    `/cajas/sesiones/${idSesion}/cierre`,
    datos,
  );
  return data;
};

export const obtenerCierres = async (filtros = {}, opciones = {}) => {
  const { data } = await api.get(
    '/cajas/cierres',
    construirConfiguracion(filtros, CAMPOS_CIERRES, opciones.signal),
  );

  return data;
};

export const obtenerResumenDiario = async (filtros, opciones = {}) => {
  const { data } = await api.get(
    '/cajas/cierres/resumen-diario',
    construirConfiguracion(filtros, CAMPOS_RESUMEN, opciones.signal),
  );

  return data;
};
