import http from 'k6/http';
import { group, sleep } from 'k6';
import { iniciarSesion } from './lib/auth.js';
import { comprobarRespuestaJson } from './lib/checks.js';
import { config } from './lib/config.js';

export const options = {
  scenarios: {
    humo: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  group('Autenticación', () => {
    iniciarSesion();
    sleep(1);

    const sesion = http.get(`${config.apiUrl}/auth/me`, {
      tags: { endpoint: 'sesion-actual' },
    });
    comprobarRespuestaJson(sesion, 'sesión actual');
    sleep(1);
  });

  group('Inventario protegido', () => {
    const inventario = http.get(
      `${config.apiUrl}/sucursales/${config.idSucursal}/inventario`,
      { tags: { endpoint: 'inventario' } },
    );
    comprobarRespuestaJson(inventario, 'inventario');
    sleep(1);
  });
}
