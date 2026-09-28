const apiUrl = String(process.env.SECURITY_API_URL || '').replace(/\/+$/, '');
const targetEnv = String(process.env.SECURITY_TARGET_ENV || '');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  assert(targetEnv === 'local', 'La prueba de rate limit solo admite el ambiente local.');
  assert(
    /^http:\/\/(backend|host\.docker\.internal):3000\/api$/i.test(apiUrl),
    'SECURITY_API_URL debe apuntar al backend local autorizado.',
  );

  const correo = `rate-limit.${Date.now()}@farmacom.test`;

  for (let attempt = 1; attempt <= 11; attempt += 1) {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        correo_usuario: correo,
        contrasena: 'clave-ficticia-invalida',
      }),
    });

    if (attempt <= 10) {
      assert(response.status === 401, `El intento ${attempt} debía devolver 401 y devolvió ${response.status}.`);
    } else {
      assert(response.status === 429, `El intento 11 debía devolver 429 y devolvió ${response.status}.`);
      assert(response.headers.has('retry-after'), 'La respuesta 429 no incluyó Retry-After.');
    }

    if (attempt === 1) {
      assert(
        response.headers.has('ratelimit') || response.headers.has('ratelimit-limit'),
        'El login no incluyó encabezados estándar de rate limiting.',
      );
      const remaining = response.headers.get('ratelimit-remaining');
      if (remaining !== null) {
        assert(remaining === '9', 'El rate limit no estaba limpio antes de iniciar la prueba.');
      }
    }
  }

  console.log('PASS: el intento 11 fue bloqueado temporalmente con 429.');
};

run().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
