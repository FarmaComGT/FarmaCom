import http from 'k6/http';
import { check, fail } from 'k6';
import { config, validarConfiguracion } from './config.js';

export const iniciarSesion = () => {
  validarConfiguracion();

  const respuesta = http.post(
    `${config.apiUrl}/auth/login`,
    JSON.stringify({
      correo_usuario: config.correo,
      contrasena: config.contrasena,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'autenticacion' },
    },
  );

  const autenticado = check(respuesta, {
    'autenticación: responde 200': (resultado) => resultado.status === 200,
    'autenticación: devuelve usuario': (resultado) => Boolean(resultado.json('usuario.id_usuario')),
    'autenticación: establece cookie': (resultado) => Boolean(resultado.cookies.auth_token?.length),
  });

  if (!autenticado) {
    fail(`No fue posible iniciar sesión. Estado recibido: ${respuesta.status}`);
  }

  return respuesta;
};
