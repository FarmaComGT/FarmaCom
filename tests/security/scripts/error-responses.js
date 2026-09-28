const apiUrl = String(process.env.SECURITY_API_URL || '').replace(/\/+$/, '');
const targetEnv = String(process.env.SECURITY_TARGET_ENV || '');
const adminEmail = String(process.env.SECURITY_ADMIN_EMAIL || '').trim();
const adminPassword = String(process.env.SECURITY_ADMIN_PASSWORD || '');

const sensitivePatterns = [
  { name: 'stack trace', pattern: /\bat\s+[^\r\n]+:\d+:\d+/i },
  { name: 'ruta de node_modules', pattern: /node_modules[\\/]/i },
  { name: 'ruta interna del backend', pattern: /backend[\\/]src[\\/]/i },
  { name: 'ruta absoluta de Unix', pattern: /\/(?:app|usr\/src|workspace)\//i },
  { name: 'ruta absoluta de Windows', pattern: /[a-z]:\\[^\r\n]+/i },
  { name: 'detalle de PostgreSQL', pattern: /postgres(?:ql)?|sqlstate|pg_[a-z_]+/i },
  { name: 'error de sintaxis SQL', pattern: /syntax error at or near/i },
  { name: 'restricción de base de datos', pattern: /violates .+ constraint|duplicate key/i },
  { name: 'estructura de base de datos', pattern: /relation .+ does not exist|column .+ does not exist/i },
  { name: 'cookie de autenticación', pattern: /auth_token\s*=/i },
  { name: 'secreto de JWT', pattern: /jwt_secret/i },
  { name: 'contraseña de PostgreSQL', pattern: /postgres_password/i },
];

const forbiddenKeys = new Set([
  'stack',
  'query',
  'sql',
  'detail',
  'constraint',
  'file',
  'line',
]);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const validateConfiguration = () => {
  assert(
    targetEnv === 'local',
    'Las comprobaciones de errores solo admiten el ambiente local.',
  );
  assert(
    /^http:\/\/(backend|host\.docker\.internal):3000\/api$/i.test(apiUrl),
    'SECURITY_API_URL debe apuntar al backend local autorizado.',
  );

  const missing = [];
  if (!adminEmail) missing.push('SECURITY_ADMIN_EMAIL');
  if (!adminPassword) missing.push('SECURITY_ADMIN_PASSWORD');
  assert(missing.length === 0, `Faltan variables requeridas: ${missing.join(', ')}`);
};

const request = async (path, options = {}) => {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  return fetch(`${apiUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    redirect: 'manual',
  });
};

const login = async () => {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correo_usuario: adminEmail,
      contrasena: adminPassword,
    }),
  });
  assert(response.status === 200, 'No fue posible iniciar sesión como administrador.');
  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(/(?:^|,\s*)auth_token=([^;]+)/i);
  assert(match, 'El login del administrador no devolvió auth_token.');
  return `auth_token=${match[1]}`;
};

const findForbiddenKey = (value, path = 'respuesta') => {
  if (!value || typeof value !== 'object') return null;

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key.toLowerCase())) return `${path}.${key}`;
    const nested = findForbiddenKey(child, `${path}.${key}`);
    if (nested) return nested;
  }
  return null;
};

const assertSafeError = async (response, testCase) => {
  assert(
    response.status === testCase.expectedStatus,
    `${testCase.name}: se esperaba ${testCase.expectedStatus} y se recibió ${response.status}.`,
  );

  const contentType = response.headers.get('content-type') || '';
  assert(
    contentType.toLowerCase().includes('application/json'),
    `${testCase.name}: la respuesta de error no utiliza application/json.`,
  );

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${testCase.name}: la respuesta de error no contiene JSON válido.`);
  }

  assert(
    json && !Array.isArray(json) && typeof json === 'object',
    `${testCase.name}: la respuesta de error no es un objeto.`,
  );
  assert(
    typeof json.mensaje === 'string' || Array.isArray(json.errores),
    `${testCase.name}: falta un mensaje o una lista de errores controlados.`,
  );

  const forbiddenKey = findForbiddenKey(json);
  assert(!forbiddenKey, `${testCase.name}: expuso el campo interno ${forbiddenKey}.`);

  for (const sensitive of sensitivePatterns) {
    assert(
      !sensitive.pattern.test(text),
      `${testCase.name}: expuso ${sensitive.name}.`,
    );
  }
};

const runCases = async (cases) => {
  const failures = [];

  for (const testCase of cases) {
    try {
      const response = await request(testCase.path, testCase.options);
      await assertSafeError(response, testCase);
      console.log(`PASS: ${testCase.name}`);
    } catch (error) {
      failures.push(error.message);
      console.error(`FAIL: ${error.message}`);
    }
  }

  return failures;
};

const run = async () => {
  validateConfiguration();
  const cookie = await login();
  const authenticated = { headers: { Cookie: cookie } };
  const malformedJson = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"correo_usuario":',
  };
  const oversizedJson = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relleno: 'a'.repeat(128 * 1024) }),
  };

  const failures = await runCases([
    {
      name: 'Identificador de lote malformado',
      path: '/lotes/no-es-entero',
      options: authenticated,
      expectedStatus: 400,
    },
    {
      name: 'Inyección en filtro de ventas',
      path: "/ventas?id_sucursal=1%27%20OR%20%271%27=%271",
      options: authenticated,
      expectedStatus: 400,
    },
    {
      name: 'Fechas inválidas en reporte',
      path: '/reportes/ventas/serie?fecha_desde=2026-13-40&fecha_hasta=texto&agrupacion=hora',
      options: authenticated,
      expectedStatus: 400,
    },
    {
      name: 'JSON incompleto',
      path: '/auth/login',
      options: malformedJson,
      expectedStatus: 400,
    },
    {
      name: 'Cuerpo JSON demasiado grande',
      path: '/auth/login',
      options: oversizedJson,
      expectedStatus: 413,
    },
    {
      name: 'Ruta de API inexistente',
      path: '/ruta-inexistente',
      options: authenticated,
      expectedStatus: 404,
    },
    {
      name: 'Método no permitido en ping',
      path: '/ping',
      options: { ...authenticated, method: 'POST' },
      expectedStatus: 404,
    },
  ]);

  try {
    const ping = await request('/ping');
    assert(ping.status === 200, 'No fue posible comprobar los encabezados de la API.');
    assert(
      !ping.headers.has('x-powered-by'),
      'La API revela su tecnología mediante X-Powered-By.',
    );
    console.log('PASS: la API no expone X-Powered-By.');
  } catch (error) {
    failures.push(error.message);
    console.error(`FAIL: ${error.message}`);
  }

  assert(
    failures.length === 0,
    `${failures.length} comprobación(es) de errores seguros fallaron.`,
  );
  console.log('PASS: errores controlados y ausencia de detalles internos verificados.');
};

run().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
