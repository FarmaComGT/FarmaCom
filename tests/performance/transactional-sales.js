import http from 'k6/http';
import exec from 'k6/execution';
import { check, fail, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { iniciarSesion } from './lib/auth.js';
import {
  comprobarObjetoJson,
  comprobarRespuestaJson,
} from './lib/checks.js';
import { config, validarConfiguracionVentas } from './lib/config.js';

const retrasoActualizacionReporte = new Trend('retraso_actualizacion_reporte', true);

const obtenerCasos = (valor) => valor.split(',').map((casoSinProcesar) => {
  const caso = casoSinProcesar.trim();
  const coincidencia = /^(\d+):(\d+)$/.exec(caso);

  if (!coincidencia || Number(coincidencia[1]) < 1 || Number(coincidencia[2]) < 1) {
    throw new Error(
      `Caso de venta inválido: "${caso}". Usa el formato id_sucursal:id_lote`,
    );
  }

  return {
    idSucursal: Number(coincidencia[1]),
    idLote: Number(coincidencia[2]),
  };
});

validarConfiguracionVentas();
const casos = obtenerCasos(config.ventas.casos);
const idsSucursales = casos.map((caso) => caso.idSucursal);

if (new Set(idsSucursales).size !== idsSucursales.length) {
  throw new Error('K6_SALES_CASES debe contener una sola caja virtual por sucursal');
}

const tiempoMaximoReporteMs = config.ventas.tiempoMaximoReporteSegundos * 1000;

export const options = {
  noCookiesReset: true,
  scenarios: {
    ventas_controladas: {
      executor: 'per-vu-iterations',
      vus: casos.length,
      iterations: config.ventas.iteracionesPorUsuario,
      maxDuration: config.ventas.duracionMaxima,
      tags: { flujo: 'ventas-controladas' },
    },
  },
  thresholds: {
    checks: ['rate>0.98'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{tipo:transaccion}': ['p(95)<2000'],
    retraso_actualizacion_reporte: [`p(95)<${tiempoMaximoReporteMs}`],
  },
};

const leerLote = (idLote, etiqueta) => {
  const respuesta = http.get(`${config.apiUrl}/lotes/${idLote}`, {
    tags: { endpoint: etiqueta, tipo: 'preparacion' },
  });

  comprobarRespuestaJson(respuesta, etiqueta);
  comprobarObjetoJson(respuesta, etiqueta);

  if (respuesta.status !== 200) {
    fail(`No fue posible consultar el lote ${idLote}. Estado recibido: ${respuesta.status}`);
  }

  return respuesta.json();
};

const contarUsoDelLote = (idLote) => casos.filter((caso) => caso.idLote === idLote).length;

const validarResumen = (respuesta, nombre) => {
  comprobarRespuestaJson(respuesta, nombre);
  comprobarObjetoJson(respuesta, nombre);

  const totalValido = check(respuesta, {
    [`${nombre}: contiene total de ventas`]: (resultado) => {
      const total = Number(resultado.json('total_ventas'));
      return Number.isInteger(total) && total >= 0;
    },
  });

  if (respuesta.status !== 200 || !totalValido) {
    fail(`No fue posible obtener ${nombre}. Estado recibido: ${respuesta.status}`);
  }

  return Number(respuesta.json('total_ventas'));
};

const obtenerTotalesReportes = (idSucursal) => {
  const respuestas = http.batch([
    [
      'GET',
      `${config.apiUrl}/reportes/ventas/resumen?id_sucursal=${idSucursal}`,
      null,
      {
        tags: {
          alcance: 'sucursal',
          endpoint: 'actualizacion-reporte',
          sucursal: String(idSucursal),
          tipo: 'reporte',
        },
      },
    ],
    [
      'GET',
      `${config.apiUrl}/reportes/ventas/resumen`,
      null,
      {
        tags: {
          alcance: 'consolidado',
          endpoint: 'actualizacion-reporte',
          tipo: 'reporte',
        },
      },
    ],
  ]);

  return {
    sucursal: validarResumen(respuestas[0], 'reporte de sucursal'),
    consolidado: validarResumen(respuestas[1], 'reporte consolidado'),
  };
};

const esperarActualizacionReportes = (idSucursal, totalesAnteriores) => {
  const inicio = Date.now();
  let actualizado = false;

  do {
    const totalesActuales = obtenerTotalesReportes(idSucursal);
    actualizado = totalesActuales.sucursal >= totalesAnteriores.sucursal + 1
      && totalesActuales.consolidado >= totalesAnteriores.consolidado + 1;

    if (!actualizado) sleep(config.ventas.intervaloReporte);
  } while (!actualizado && Date.now() - inicio < tiempoMaximoReporteMs);

  const retraso = Date.now() - inicio;
  retrasoActualizacionReporte.add(retraso, { sucursal: String(idSucursal) });

  const cumpleTiempo = check({ actualizado, retraso }, {
    'reportes: reflejan la venta dentro del tiempo máximo': (resultado) => (
      resultado.actualizado && resultado.retraso < tiempoMaximoReporteMs
    ),
  });

  if (!cumpleTiempo) {
    fail(`Los reportes no reflejaron la venta de la sucursal ${idSucursal} a tiempo`);
  }
};

export function setup() {
  iniciarSesion();

  casos.forEach(({ idSucursal, idLote }) => {
    const lote = leerLote(idLote, 'prevalidación de lote');
    const unidadesNecesarias = config.ventas.cantidad
      * config.ventas.iteracionesPorUsuario
      * contarUsoDelLote(idLote);

    const loteValido = check(lote, {
      [`lote ${idLote}: pertenece a la sucursal configurada`]: (resultado) => (
        Number(resultado.id_sucursal) === idSucursal
      ),
      [`lote ${idLote}: tiene existencias suficientes`]: (resultado) => (
        Number(resultado.stock_actual) >= unidadesNecesarias
      ),
      [`lote ${idLote}: no está vencido`]: (resultado) => resultado.estado_vencimiento !== 'vencido',
      [`lote ${idLote}: tiene un precio válido`]: (resultado) => (
        Number.isFinite(Number(resultado.precio_venta)) && Number(resultado.precio_venta) >= 0
      ),
    });

    if (!loteValido) {
      fail(
        `El lote ${idLote} no cumple las condiciones para ejecutar ${unidadesNecesarias} ventas`,
      );
    }
  });
}

let sesionIniciada = false;

const asegurarSesion = () => {
  if (!sesionIniciada) {
    iniciarSesion();
    sesionIniciada = true;
  }
};

export default function () {
  asegurarSesion();
  const caso = casos[(exec.vu.idInTest - 1) % casos.length];

  group(`Venta controlada: sucursal ${caso.idSucursal}`, () => {
    const lote = leerLote(caso.idLote, 'consulta de lote para venta');
    const totalesAnteriores = obtenerTotalesReportes(caso.idSucursal);
    const precioTotal = Math.round(
      Number(lote.precio_venta) * config.ventas.cantidad * 100,
    ) / 100;

    const respuesta = http.post(
      `${config.apiUrl}/ventas`,
      JSON.stringify({
        id_sucursal: caso.idSucursal,
        id_cliente: null,
        detalles: [{
          id_lote: caso.idLote,
          cantidad: config.ventas.cantidad,
        }],
        metodo_pago: 'efectivo',
        monto_recibido: precioTotal.toFixed(2),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'crear-venta-efectivo', tipo: 'transaccion' },
      },
    );

    comprobarRespuestaJson(respuesta, 'creación de venta', 201);
    comprobarObjetoJson(respuesta, 'creación de venta');

    check(respuesta, {
      'venta: devuelve un identificador': (resultado) => (
        Number.isInteger(Number(resultado.json('id_venta')))
        && Number(resultado.json('id_venta')) > 0
      ),
      'venta: conserva la sucursal': (resultado) => (
        Number(resultado.json('id_sucursal')) === caso.idSucursal
      ),
      'venta: registra el lote y la cantidad': (resultado) => {
        const detalles = resultado.json('detalles');
        return Array.isArray(detalles)
          && detalles.some((detalle) => (
            Number(detalle.id_lote) === caso.idLote
            && Number(detalle.cantidad) === config.ventas.cantidad
          ));
      },
    });

    esperarActualizacionReportes(caso.idSucursal, totalesAnteriores);

    const loteActualizado = leerLote(caso.idLote, 'verificación de inventario');
    check(loteActualizado, {
      'inventario: el stock permanece no negativo': (resultado) => (
        Number(resultado.stock_actual) >= 0
      ),
    });
  });

  sleep(config.ventas.pausa);
}
