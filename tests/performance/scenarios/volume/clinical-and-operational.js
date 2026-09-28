import http from 'k6/http';
import exec from 'k6/execution';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { iniciarSesion } from '../../lib/auth.js';
import {
  comprobarArregloJson,
  comprobarObjetoJson,
  comprobarRespuestaJson,
} from '../../lib/checks.js';
import { config } from '../../lib/config.js';

const consultasClinicas = new Counter('consultas_clinicas');
const consultasCierres = new Counter('consultas_cierres');
const consultasReportesVolumen = new Counter('consultas_reportes_volumen');

const etapas = (usuarios) => [
  { duration: config.volumen.incremento, target: usuarios },
  { duration: config.volumen.duracionEstable, target: usuarios },
  { duration: config.volumen.descenso, target: 0 },
];

export const options = {
  noCookiesReset: true,
  scenarios: {
    volumen_clinico: {
      executor: 'ramping-vus',
      exec: 'consultarPacientesYExpedientes',
      startVUs: 0,
      stages: etapas(config.volumen.usuariosClinicos),
      gracefulRampDown: '10s',
      tags: { flujo: 'volumen-clinico' },
    },
    volumen_cierres: {
      executor: 'ramping-vus',
      exec: 'consultarCierres',
      startVUs: 0,
      stages: etapas(config.volumen.usuariosCierres),
      gracefulRampDown: '10s',
      tags: { flujo: 'volumen-cierres' },
    },
    volumen_reportes: {
      executor: 'ramping-vus',
      exec: 'consultarReportesHistoricos',
      startVUs: 0,
      stages: etapas(config.volumen.usuariosReportes),
      gracefulRampDown: '10s',
      tags: { flujo: 'volumen-reportes' },
    },
  },
  thresholds: {
    checks: ['rate>0.98'],
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<3000'],
    'http_req_duration{tipo:consulta-volumen}': ['p(95)<2000'],
    'http_req_duration{tipo:reporte}': ['p(95)<3000'],
    'http_req_duration{endpoint:buscar-pacientes}': ['p(95)<2000'],
    consultas_clinicas: ['count>0'],
    consultas_cierres: ['count>0'],
    consultas_reportes_volumen: ['count>0'],
  },
};

let sesionIniciada = false;

const asegurarSesion = () => {
  if (!sesionIniciada) {
    iniciarSesion();
    sesionIniciada = true;
  }
};

const pausaUsuario = () => sleep(1 + Math.random());

const formatearFecha = (fecha) => fecha.toISOString().slice(0, 10);

const obtenerRangoHistorico = () => {
  const fechaHasta = config.reportes.fechaHasta || formatearFecha(new Date());
  const inicioPredeterminado = new Date();
  inicioPredeterminado.setUTCDate(inicioPredeterminado.getUTCDate() - 365);
  const fechaDesde = config.reportes.fechaDesde || formatearFecha(inicioPredeterminado);
  return { fechaDesde, fechaHasta };
};

const obtenerIdSucursal = () => {
  const indice = (exec.vu.idInTest - 1) % config.idsSucursales.length;
  return config.idsSucursales[indice];
};

const extraerJson = (respuesta, valorPredeterminado) => {
  try {
    return respuesta.json();
  } catch (_error) {
    return valorPredeterminado;
  }
};

export function consultarPacientesYExpedientes() {
  asegurarSesion();
  const paginas = Math.max(1, Math.ceil(config.volumen.pacientesPreparados / 100));
  const pagina = 1 + Math.floor(Math.random() * paginas);
  const parametros = [
    `id_laboratorio=${config.idLaboratorio}`,
    `busqueda=${encodeURIComponent('K6 Paciente')}`,
    'estado=activo',
    `pagina=${pagina}`,
    'limite=100',
  ].join('&');

  group('Volumen: pacientes y expedientes', () => {
    const pacientes = http.get(`${config.apiUrl}/pacientes?${parametros}`, {
      tags: { endpoint: 'buscar-pacientes', tipo: 'consulta-volumen' },
    });
    consultasClinicas.add(1);
    comprobarRespuestaJson(pacientes, 'búsqueda de pacientes');
    comprobarObjetoJson(pacientes, 'búsqueda de pacientes');

    const contenido = extraerJson(pacientes, {});
    const listadoValido = check(contenido, {
      'búsqueda de pacientes: devuelve datos paginados': (resultado) => (
        Array.isArray(resultado.datos)
        && resultado.datos.length > 0
        && Number(resultado.paginacion?.total) >= config.volumen.pacientesPreparados
      ),
    });

    if (!listadoValido) return;

    const paciente = contenido.datos[Math.floor(Math.random() * contenido.datos.length)];
    const respuestas = http.batch([
      [
        'GET',
        `${config.apiUrl}/pacientes/${paciente.id_paciente}`,
        null,
        { tags: { endpoint: 'detalle-expediente', tipo: 'consulta-volumen' } },
      ],
      [
        'GET',
        `${config.apiUrl}/resultados-laboratorio?id_paciente=${paciente.id_paciente}`,
        null,
        { tags: { endpoint: 'resultados-expediente', tipo: 'consulta-volumen' } },
      ],
    ]);

    comprobarRespuestaJson(respuestas[0], 'detalle de paciente y expediente');
    comprobarObjetoJson(respuestas[0], 'detalle de paciente y expediente');
    check(respuestas[0], {
      'detalle de paciente: incluye expediente': (respuesta) => (
        Number(extraerJson(respuesta, {}).id_expediente) > 0
      ),
    });
    comprobarRespuestaJson(respuestas[1], 'resultados del expediente');
    comprobarArregloJson(respuestas[1], 'resultados del expediente');
  });

  pausaUsuario();
}

export function consultarCierres() {
  asegurarSesion();
  const idSucursal = obtenerIdSucursal();
  const { fechaDesde, fechaHasta } = obtenerRangoHistorico();

  group(`Volumen: cierres - sucursal ${idSucursal}`, () => {
    const respuestas = http.batch([
      [
        'GET',
        `${config.apiUrl}/cajas/cierres?id_sucursal=${idSucursal}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`,
        null,
        { tags: { endpoint: 'cierres-historicos', tipo: 'consulta-volumen', sucursal: String(idSucursal) } },
      ],
      [
        'GET',
        `${config.apiUrl}/cajas/cierres/resumen-diario?id_sucursal=${idSucursal}&fecha=${fechaHasta}`,
        null,
        { tags: { endpoint: 'resumen-cierres', tipo: 'consulta-volumen', sucursal: String(idSucursal) } },
      ],
    ]);
    consultasCierres.add(1, { sucursal: String(idSucursal) });

    comprobarRespuestaJson(respuestas[0], 'cierres históricos');
    comprobarArregloJson(respuestas[0], 'cierres históricos');
    check(respuestas[0], {
      'cierres históricos: devuelve datos preparados': (respuesta) => (
        extraerJson(respuesta, []).some((cierre) => String(cierre.observaciones).startsWith('K6-VOLUME-'))
      ),
    });
    comprobarRespuestaJson(respuestas[1], 'resumen diario de cierres');
    comprobarArregloJson(respuestas[1], 'resumen diario de cierres');
  });

  pausaUsuario();
}

export function consultarReportesHistoricos() {
  asegurarSesion();
  const { fechaDesde, fechaHasta } = obtenerRangoHistorico();
  const filtros = `fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;

  group('Volumen: reportes históricos', () => {
    const respuestas = http.batch([
      ['GET', `${config.apiUrl}/reportes/ventas/resumen?${filtros}`, null,
        { tags: { endpoint: 'resumen-ventas-volumen', tipo: 'reporte' } }],
      ['GET', `${config.apiUrl}/reportes/ventas/serie?${filtros}&agrupacion=mes`, null,
        { tags: { endpoint: 'serie-ventas-volumen', tipo: 'reporte' } }],
      ['GET', `${config.apiUrl}/reportes/ventas/metodos-pago?${filtros}`, null,
        { tags: { endpoint: 'metodos-pago-volumen', tipo: 'reporte' } }],
      ['GET', `${config.apiUrl}/reportes/productos/top?${filtros}&limite=20&criterio=ingresos`, null,
        { tags: { endpoint: 'top-productos-volumen', tipo: 'reporte' } }],
      ['GET', `${config.apiUrl}/reportes/rentabilidad?${filtros}`, null,
        { tags: { endpoint: 'rentabilidad-volumen', tipo: 'reporte' } }],
    ]);
    consultasReportesVolumen.add(1);

    comprobarRespuestaJson(respuestas[0], 'resumen histórico de ventas');
    comprobarObjetoJson(respuestas[0], 'resumen histórico de ventas');
    const nombres = [
      'serie histórica de ventas',
      'métodos de pago históricos',
      'productos históricos más vendidos',
      'rentabilidad histórica',
    ];
    respuestas.slice(1).forEach((respuesta, indice) => {
      comprobarRespuestaJson(respuesta, nombres[indice]);
      comprobarArregloJson(respuesta, nombres[indice]);
    });
  });

  pausaUsuario();
}
