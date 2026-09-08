const normalizarUrl = (url) => String(url || '').trim().replace(/\/+$/, '');

const convertirEnteroPositivo = (valor, valorPredeterminado) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : valorPredeterminado;
};

const convertirTexto = (valor, valorPredeterminado) => {
  const texto = String(valor || '').trim();
  return texto || valorPredeterminado;
};

const convertirNumeroPositivo = (valor, valorPredeterminado) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : valorPredeterminado;
};

const convertirListaEnterosPositivos = (valor, valorPredeterminado) => {
  const texto = String(valor || '').trim();
  if (!texto) return Object.freeze([valorPredeterminado]);

  const ids = texto.split(',').map((elemento) => Number(elemento.trim()));
  const listaValida = ids.every((id) => Number.isInteger(id) && id > 0);

  if (!listaValida) {
    throw new Error('K6_BRANCH_IDS debe contener identificadores positivos separados por comas');
  }

  return Object.freeze([...new Set(ids)]);
};

export const config = Object.freeze({
  apiUrl: normalizarUrl(__ENV.K6_API_URL || 'http://backend:3000/api'),
  correo: String(__ENV.K6_USER_EMAIL || '').trim(),
  contrasena: String(__ENV.K6_USER_PASSWORD || ''),
  idSucursal: convertirEnteroPositivo(__ENV.K6_BRANCH_ID, 1),
  idsSucursales: convertirListaEnterosPositivos(
    __ENV.K6_BRANCH_IDS,
    convertirEnteroPositivo(__ENV.K6_BRANCH_ID, 1),
  ),
  carga: Object.freeze({
    usuariosPOS: convertirEnteroPositivo(__ENV.K6_LOAD_POS_VUS, 3),
    usuariosGestion: convertirEnteroPositivo(__ENV.K6_LOAD_MANAGEMENT_VUS, 2),
    usuariosReportes: convertirEnteroPositivo(__ENV.K6_LOAD_REPORTS_VUS, 1),
    incremento: convertirTexto(__ENV.K6_LOAD_RAMP_UP, '30s'),
    duracionEstable: convertirTexto(__ENV.K6_LOAD_STEADY_DURATION, '4m'),
    descenso: convertirTexto(__ENV.K6_LOAD_RAMP_DOWN, '30s'),
  }),
  estres: Object.freeze({
    usuariosMaximos: convertirEnteroPositivo(__ENV.K6_STRESS_MAX_VUS, 20),
    usuariosRecuperacion: convertirEnteroPositivo(__ENV.K6_STRESS_RECOVERY_VUS, 3),
    calentamiento: convertirTexto(__ENV.K6_STRESS_WARM_UP, '15s'),
    duracionEtapa: convertirTexto(__ENV.K6_STRESS_STAGE_DURATION, '30s'),
    duracionRecuperacion: convertirTexto(__ENV.K6_STRESS_RECOVERY_DURATION, '1m'),
    enfriamiento: convertirTexto(__ENV.K6_STRESS_COOL_DOWN, '15s'),
  }),
  ventas: Object.freeze({
    entorno: convertirTexto(__ENV.K6_TARGET_ENV, ''),
    permitirEscrituras: String(__ENV.K6_ALLOW_WRITES || '').trim().toLowerCase() === 'true',
    casos: String(__ENV.K6_SALES_CASES || '').trim(),
    cantidad: convertirEnteroPositivo(__ENV.K6_SALES_QUANTITY, 1),
    iteracionesPorUsuario: convertirEnteroPositivo(__ENV.K6_SALES_ITERATIONS_PER_VU, 3),
    duracionMaxima: convertirTexto(__ENV.K6_SALES_MAX_DURATION, '2m'),
    pausa: convertirNumeroPositivo(__ENV.K6_SALES_THINK_TIME, 1),
    tiempoMaximoReporteSegundos: convertirNumeroPositivo(
      __ENV.K6_REPORT_REFRESH_TIMEOUT_SECONDS,
      20,
    ),
    intervaloReporte: convertirNumeroPositivo(__ENV.K6_REPORT_POLL_INTERVAL, 0.25),
  }),
  reportes: Object.freeze({
    fechaDesde: String(__ENV.K6_REPORT_DATE_FROM || '').trim(),
    fechaHasta: String(__ENV.K6_REPORT_DATE_TO || '').trim(),
  }),
});

export const validarConfiguracion = () => {
  const faltantes = [];

  if (!config.correo) faltantes.push('K6_USER_EMAIL');
  if (!config.contrasena) faltantes.push('K6_USER_PASSWORD');

  if (faltantes.length > 0) {
    throw new Error(`Faltan variables requeridas: ${faltantes.join(', ')}`);
  }
};

export const validarConfiguracionVentas = () => {
  validarConfiguracion();
  const urlLocal = /^https?:\/\/(backend|localhost|127\.0\.0\.1|host\.docker\.internal)(:\d+)?(\/|$)/i;

  if (!config.ventas.permitirEscrituras) {
    throw new Error('La prueba de ventas requiere K6_ALLOW_WRITES=true');
  }

  if (config.ventas.entorno.toLowerCase() !== 'local') {
    throw new Error('La prueba de ventas solo puede ejecutarse con K6_TARGET_ENV=local');
  }

  if (!urlLocal.test(config.apiUrl)) {
    throw new Error('La prueba de ventas solo admite una URL local para K6_API_URL');
  }

  if (!config.ventas.casos) {
    throw new Error('Falta K6_SALES_CASES con el formato id_sucursal:id_lote');
  }
};
