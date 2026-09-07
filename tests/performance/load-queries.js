import http from 'k6/http';
import exec from 'k6/execution';
import { group, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { iniciarSesion } from './lib/auth.js';
import {
  comprobarArregloJson,
  comprobarObjetoJson,
  comprobarRespuestaJson,
} from './lib/checks.js';
import { config } from './lib/config.js';

const actividadSucursal = new Counter('actividad_sucursal');
const umbralesSucursales = {};
config.idsSucursales.forEach((idSucursal) => {
  umbralesSucursales[`actividad_sucursal{sucursal:${idSucursal}}`] = ['count>0'];
});

const etapas = (usuarios) => [
  { duration: config.carga.incremento, target: usuarios },
  { duration: config.carga.duracionEstable, target: usuarios },
  { duration: config.carga.descenso, target: 0 },
];

export const options = {
  noCookiesReset: true,
  scenarios: {
    punto_venta: {
      executor: 'ramping-vus',
      exec: 'consultarPuntoVenta',
      startVUs: 0,
      stages: etapas(config.carga.usuariosPOS),
      gracefulRampDown: '10s',
      tags: { flujo: 'punto-venta' },
    },
    gestion: {
      executor: 'ramping-vus',
      exec: 'consultarGestion',
      startVUs: 0,
      stages: etapas(config.carga.usuariosGestion),
      gracefulRampDown: '10s',
      tags: { flujo: 'gestion' },
    },
    reportes: {
      executor: 'ramping-vus',
      exec: 'consultarReportes',
      startVUs: 0,
      stages: etapas(config.carga.usuariosReportes),
      gracefulRampDown: '10s',
      tags: { flujo: 'reportes' },
    },
  },
  thresholds: {
    checks: ['rate>0.98'],
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<3000'],
    'http_req_duration{tipo:consulta}': ['p(95)<2000'],
    'http_req_duration{tipo:reporte}': ['p(95)<3000'],
    'http_req_duration{endpoint:autocompletar-pos}': ['p(95)<5000'],
    ...umbralesSucursales,
  },
};

let sesionIniciada = false;

const asegurarSesion = () => {
  if (!sesionIniciada) {
    iniciarSesion();
    sesionIniciada = true;
  }
};

const pausaUsuario = () => sleep(1 + Math.random() * 2);

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

export function consultarPuntoVenta() {
  asegurarSesion();
  const idSucursal = obtenerIdSucursal();
  actividadSucursal.add(1, { sucursal: String(idSucursal) });

  group(`Carga: punto de venta - sucursal ${idSucursal}`, () => {
    const respuestas = http.batch([
      [
        'GET',
        `${config.apiUrl}/productos/autocompletar?busqueda=a&limite=10`,
        null,
        { tags: { endpoint: 'autocompletar-pos', tipo: 'consulta', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/sucursales/${idSucursal}/inventario`,
        null,
        { tags: { endpoint: 'inventario', tipo: 'consulta', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/cajas?id_sucursal=${idSucursal}&activa=true`,
        null,
        { tags: { endpoint: 'cajas-activas', tipo: 'consulta', sucursal: String(idSucursal) } },
      ],
    ]);

    const nombres = ['autocompletado', 'inventario', 'cajas activas'];
    respuestas.forEach((respuesta, indice) => {
      comprobarRespuestaJson(respuesta, nombres[indice]);
      comprobarArregloJson(respuesta, nombres[indice]);
    });
  });

  pausaUsuario();
}

export function consultarGestion() {
  asegurarSesion();
  const idSucursal = obtenerIdSucursal();

  group(`Carga: gestión - sucursal ${idSucursal}`, () => {
    const respuestas = http.batch([
      [
        'GET',
        `${config.apiUrl}/clientes`,
        null,
        { tags: { endpoint: 'clientes', tipo: 'consulta', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/productos`,
        null,
        { tags: { endpoint: 'productos', tipo: 'consulta', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/sucursales/${idSucursal}/inventario/resumen`,
        null,
        { tags: { endpoint: 'resumen-inventario', tipo: 'consulta', sucursal: String(idSucursal) } },
      ],
    ]);

    comprobarRespuestaJson(respuestas[0], 'clientes');
    comprobarArregloJson(respuestas[0], 'clientes');
    comprobarRespuestaJson(respuestas[1], 'productos');
    comprobarArregloJson(respuestas[1], 'productos');
    comprobarRespuestaJson(respuestas[2], 'resumen de inventario');
    comprobarObjetoJson(respuestas[2], 'resumen de inventario');
  });

  pausaUsuario();
}

export function consultarReportes() {
  asegurarSesion();
  const { fechaDesde, fechaHasta } = obtenerRangoReportes();
  const filtros = `fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;

  group('Carga: reportes', () => {
    const respuestas = http.batch([
      [
        'GET',
        `${config.apiUrl}/reportes/ventas/resumen?${filtros}`,
        null,
        { tags: { alcance: 'consolidado', endpoint: 'resumen-ventas', tipo: 'reporte' } },
      ],
      [
        'GET',
        `${config.apiUrl}/reportes/ventas/serie?${filtros}&agrupacion=dia`,
        null,
        { tags: { alcance: 'consolidado', endpoint: 'serie-ventas', tipo: 'reporte' } },
      ],
      [
        'GET',
        `${config.apiUrl}/reportes/ventas/metodos-pago?${filtros}`,
        null,
        { tags: { alcance: 'consolidado', endpoint: 'metodos-pago', tipo: 'reporte' } },
      ],
      [
        'GET',
        `${config.apiUrl}/reportes/productos/top?${filtros}&limite=5&criterio=cantidad`,
        null,
        { tags: { alcance: 'consolidado', endpoint: 'top-productos', tipo: 'reporte' } },
      ],
    ]);

    comprobarRespuestaJson(respuestas[0], 'resumen de ventas');
    comprobarObjetoJson(respuestas[0], 'resumen de ventas');

    const nombres = ['serie de ventas', 'métodos de pago', 'productos más vendidos'];
    respuestas.slice(1).forEach((respuesta, indice) => {
      comprobarRespuestaJson(respuesta, nombres[indice]);
      comprobarArregloJson(respuesta, nombres[indice]);
    });
  });

  pausaUsuario();
}
