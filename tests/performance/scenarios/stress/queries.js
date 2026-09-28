import http from 'k6/http';
import exec from 'k6/execution';
import { group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { iniciarSesion } from '../../lib/auth.js';
import {
  comprobarArregloJson,
  comprobarObjetoJson,
  comprobarRespuestaJson,
} from '../../lib/checks.js';
import { config } from '../../lib/config.js';

const actividadSucursal = new Counter('actividad_sucursal');
const consultasModulosSecundarios = new Counter('consultas_modulos_secundarios');
const muestrasRecuperacion = new Counter('muestras_recuperacion');
const duracionRecuperacion = new Trend('duracion_recuperacion', true);
const erroresRecuperacion = new Rate('errores_recuperacion');
const umbralesSucursales = {};
config.idsSucursales.forEach((idSucursal) => {
  umbralesSucursales[`actividad_sucursal{sucursal:${idSucursal}}`] = ['count>0'];
});

const usuariosPorProporcion = (proporcion) => Math.max(
  1,
  Math.round(config.estres.usuariosMaximos * proporcion),
);

const usuariosRecuperacion = Math.min(
  config.estres.usuariosRecuperacion,
  config.estres.usuariosMaximos,
);

const convertirDuracionMilisegundos = (duracion) => {
  const texto = String(duracion).trim();
  const patron = /(\d+(?:\.\d+)?)(ms|s|m|h)/g;
  const factores = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  let total = 0;
  let posicion = 0;
  let coincidencia = patron.exec(texto);

  while (coincidencia) {
    if (coincidencia.index !== posicion) throw new Error(`Duración no válida: ${texto}`);
    total += Number(coincidencia[1]) * factores[coincidencia[2]];
    posicion = patron.lastIndex;
    coincidencia = patron.exec(texto);
  }

  if (posicion !== texto.length || total <= 0) throw new Error(`Duración no válida: ${texto}`);
  return total;
};

const inicioRecuperacionMs = convertirDuracionMilisegundos(config.estres.calentamiento)
  + (convertirDuracionMilisegundos(config.estres.duracionEtapa) * 6);

export const options = {
  noCookiesReset: true,
  scenarios: {
    estres_y_recuperacion: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: config.estres.calentamiento, target: 1 },
        { duration: config.estres.duracionEtapa, target: usuariosPorProporcion(0.25) },
        { duration: config.estres.duracionEtapa, target: usuariosPorProporcion(0.50) },
        { duration: config.estres.duracionEtapa, target: usuariosPorProporcion(0.75) },
        { duration: config.estres.duracionEtapa, target: config.estres.usuariosMaximos },
        { duration: config.estres.duracionEtapa, target: config.estres.usuariosMaximos },
        { duration: config.estres.duracionEtapa, target: usuariosRecuperacion },
        { duration: config.estres.duracionRecuperacion, target: usuariosRecuperacion },
        { duration: config.estres.enfriamiento, target: 0 },
      ],
      gracefulRampDown: '15s',
      tags: { flujo: 'estres-consultas' },
    },
  },
  thresholds: {
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000'],
    'http_req_duration{endpoint:autocompletar-pos}': ['p(95)<5000'],
    duracion_recuperacion: ['p(95)<2000'],
    errores_recuperacion: ['rate<0.02'],
    muestras_recuperacion: ['count>0'],
    consultas_modulos_secundarios: ['count>0'],
    ...umbralesSucursales,
  },
};

export function setup() {
  return { inicioEscenario: Date.now() };
}

let sesionIniciada = false;

const asegurarSesion = () => {
  if (!sesionIniciada) {
    iniciarSesion();
    sesionIniciada = true;
  }
};

const obtenerIdSucursal = () => {
  const indice = (exec.vu.idInTest - 1) % config.idsSucursales.length;
  return config.idsSucursales[indice];
};

const formatearFecha = (fecha) => fecha.toISOString().slice(0, 10);

const obtenerRangoReportes = () => {
  const fechaHasta = config.reportes.fechaHasta || formatearFecha(new Date());
  const inicioPredeterminado = new Date();
  inicioPredeterminado.setUTCDate(inicioPredeterminado.getUTCDate() - 30);
  const fechaDesde = config.reportes.fechaDesde || formatearFecha(inicioPredeterminado);

  return { fechaDesde, fechaHasta };
};

const registrarRecuperacion = (respuestas, enRecuperacion) => {
  if (!enRecuperacion) return;

  respuestas.forEach((respuesta) => {
    duracionRecuperacion.add(respuesta.timings.duration);
    erroresRecuperacion.add(respuesta.status < 200 || respuesta.status >= 400);
    muestrasRecuperacion.add(1);
  });
};

const consultarModulosSecundarios = ({ idSucursal, fechaDesde, fechaHasta, fase }) => {
  const respuestas = http.batch([
    [
      'GET',
      `${config.apiUrl}/pacientes?id_laboratorio=${config.idLaboratorio}&busqueda=${encodeURIComponent('K6 Paciente')}&pagina=1&limite=20`,
      null,
      { tags: { endpoint: 'pacientes-secundario', fase, prioridad: 'secundaria', tipo: 'estres' } },
    ],
    [
      'GET',
      `${config.apiUrl}/resultados-laboratorio/categorias?id_laboratorio=${config.idLaboratorio}`,
      null,
      { tags: { endpoint: 'laboratorio-secundario', fase, prioridad: 'secundaria', tipo: 'estres' } },
    ],
    [
      'GET',
      `${config.apiUrl}/cajas/cierres?id_sucursal=${idSucursal}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`,
      null,
      { tags: { endpoint: 'cierres-secundario', fase, prioridad: 'secundaria', sucursal: String(idSucursal), tipo: 'estres' } },
    ],
  ]);
  consultasModulosSecundarios.add(1);

  comprobarRespuestaJson(respuestas[0], 'pacientes durante estrés');
  comprobarObjetoJson(respuestas[0], 'pacientes durante estrés');
  comprobarRespuestaJson(respuestas[1], 'categorías de laboratorio durante estrés');
  comprobarArregloJson(respuestas[1], 'categorías de laboratorio durante estrés');
  comprobarRespuestaJson(respuestas[2], 'cierres durante estrés');
  comprobarArregloJson(respuestas[2], 'cierres durante estrés');

  return respuestas;
};

export default function (datos) {
  asegurarSesion();
  const idSucursal = obtenerIdSucursal();
  actividadSucursal.add(1, { sucursal: String(idSucursal) });
  const { fechaDesde, fechaHasta } = obtenerRangoReportes();
  const filtros = `fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
  const enRecuperacion = Date.now() - datos.inicioEscenario >= inicioRecuperacionMs;
  const fase = enRecuperacion ? 'recuperacion' : 'incremento-pico';

  group(`Estrés: consultas combinadas - sucursal ${idSucursal}`, () => {
    const respuestas = http.batch([
      [
        'GET',
        `${config.apiUrl}/productos/autocompletar?busqueda=a&limite=10`,
        null,
        { tags: { endpoint: 'autocompletar-pos', fase, tipo: 'estres', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/sucursales/${idSucursal}/inventario`,
        null,
        { tags: { endpoint: 'inventario', fase, tipo: 'estres', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/clientes`,
        null,
        { tags: { endpoint: 'clientes', fase, tipo: 'estres', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/reportes/ventas/resumen?${filtros}`,
        null,
        { tags: { alcance: 'consolidado', endpoint: 'resumen-ventas', fase, tipo: 'estres' } },
      ],
      [
        'GET',
        `${config.apiUrl}/reportes/productos/top?${filtros}&limite=5&criterio=cantidad`,
        null,
        { tags: { alcance: 'consolidado', endpoint: 'top-productos', fase, tipo: 'estres' } },
      ],
    ]);

    const arreglos = [
      ['autocompletado', respuestas[0]],
      ['inventario', respuestas[1]],
      ['clientes', respuestas[2]],
      ['productos más vendidos', respuestas[4]],
    ];

    arreglos.forEach(([nombre, respuesta]) => {
      comprobarRespuestaJson(respuesta, nombre);
      comprobarArregloJson(respuesta, nombre);
    });

    comprobarRespuestaJson(respuestas[3], 'resumen de ventas');
    comprobarObjetoJson(respuestas[3], 'resumen de ventas');
    registrarRecuperacion(respuestas, enRecuperacion);

    if (exec.scenario.iterationInTest % config.estres.frecuenciaModulosSecundarios === 0) {
      const respuestasSecundarias = consultarModulosSecundarios({
        idSucursal,
        fechaDesde,
        fechaHasta,
        fase,
      });
      registrarRecuperacion(respuestasSecundarias, enRecuperacion);
    }
  });

  sleep(0.5 + Math.random());
}
