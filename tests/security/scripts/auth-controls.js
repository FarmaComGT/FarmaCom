const { createHmac } = require('node:crypto');

const apiUrl = String(process.env.SECURITY_API_URL || '').replace(/\/+$/, '');
const targetEnv = String(process.env.SECURITY_TARGET_ENV || '');
const adminEmail = String(process.env.SECURITY_ADMIN_EMAIL || '').trim();
const adminPassword = String(process.env.SECURITY_ADMIN_PASSWORD || '');
const inactiveEmail = String(process.env.SECURITY_INACTIVE_EMAIL || '').trim();
const inactivePassword = String(process.env.SECURITY_INACTIVE_PASSWORD || '');
const jwtSecret = String(process.env.SECURITY_JWT_SECRET || '');
const expectSecureCookie = String(
  process.env.SECURITY_EXPECT_SECURE_COOKIE || 'false',
).toLowerCase() === 'true';

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const validateConfiguration = () => {
  assert(targetEnv === 'local', 'Las comprobaciones de autenticación solo admiten el ambiente local.');
  assert(
    /^http:\/\/(backend|host\.docker\.internal):3000\/api$/i.test(apiUrl),
    'SECURITY_API_URL debe apuntar al backend local autorizado.',
  );

  const missing = [];
  if (!adminEmail) missing.push('SECURITY_ADMIN_EMAIL');
  if (!adminPassword) missing.push('SECURITY_ADMIN_PASSWORD');
  if (!inactiveEmail) missing.push('SECURITY_INACTIVE_EMAIL');
  if (!inactivePassword) missing.push('SECURITY_INACTIVE_PASSWORD');
  if (!jwtSecret) missing.push('SECURITY_JWT_SECRET');

  assert(missing.length === 0, `Faltan variables requeridas: ${missing.join(', ')}`);
};

const request = async (path, options = {}) => {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  let body = options.body;

  if (body && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body,
    redirect: 'manual',
  });
  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      fail(`${options.name || path} devolvió un cuerpo que no es JSON.`);
    }
  }

  return { response, json };
};

const login = (correo, contrasena, name) => request('/auth/login', {
  name,
  method: 'POST',
  body: { correo_usuario: correo, contrasena },
});

const extractAuthCookie = (response) => {
  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(/(?:^|,\s*)auth_token=([^;]+)/i);
  assert(match, 'El login válido no devolvió la cookie auth_token.');
  return { cookie: `auth_token=${match[1]}`, setCookie, token: match[1] };
};

const alterToken = (token) => {
  const last = token.at(-1);
  return `${token.slice(0, -1)}${last === 'a' ? 'b' : 'a'}`;
};

const createExpiredToken = (token) => {
  const parts = token.split('.');
  assert(parts.length === 3, 'La cookie de autenticación no contiene un JWT válido.');

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  assert(header.alg === 'HS256', `Algoritmo JWT inesperado: ${header.alg}`);

  const expiredPayload = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000) - 120,
    exp: Math.floor(Date.now() / 1000) - 60,
  })).toString('base64url');
  const unsigned = `${parts[0]}.${expiredPayload}`;
  const signature = createHmac('sha256', jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
};

const run = async () => {
  validateConfiguration();

  const noSession = await request('/auth/me', { name: 'Solicitud sin sesión' });
  assert(noSession.response.status === 401, 'Una solicitud sin sesión no devolvió 401.');
  assert(!noSession.json?.usuario, 'La respuesta 401 expuso información del usuario.');

  const unknownEmail = `inexistente.${Date.now()}@farmacom.test`;
  const unknown = await login(unknownEmail, 'clave-ficticia-invalida', 'Usuario inexistente');
  const wrongPassword = await login(adminEmail, `${adminPassword}-incorrecta`, 'Contraseña incorrecta');
  assert(unknown.response.status === 401, 'Un usuario inexistente no devolvió 401.');
  assert(wrongPassword.response.status === 401, 'Una contraseña incorrecta no devolvió 401.');
  assert(
    unknown.json?.mensaje === wrongPassword.json?.mensaje,
    'El login permite distinguir entre usuario inexistente y contraseña incorrecta.',
  );

  const inactive = await login(inactiveEmail, inactivePassword, 'Cuenta inactiva');
  assert(inactive.response.status === 403, 'Una cuenta inactiva no devolvió 403.');
  assert(!inactive.response.headers.get('set-cookie'), 'Una cuenta inactiva recibió una cookie.');

  const validLogin = await login(adminEmail, adminPassword, 'Administrador activo');
  assert(validLogin.response.status === 200, 'El administrador ficticio no pudo iniciar sesión.');
  assert(validLogin.json?.usuario?.rol === 'administrador', 'La cuenta configurada no es administrador.');

  const { cookie, setCookie, token } = extractAuthCookie(validLogin.response);
  const cookieAttributes = setCookie
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim().toLowerCase());
  assert(cookieAttributes.includes('httponly'), 'auth_token no utiliza HttpOnly.');
  assert(cookieAttributes.includes('samesite=strict'), 'auth_token no utiliza SameSite=Strict.');
  assert(cookieAttributes.includes('path=/'), 'auth_token no utiliza Path=/.');
  assert(
    cookieAttributes.includes('secure') === expectSecureCookie,
    expectSecureCookie
      ? 'auth_token no utiliza Secure en el ambiente evaluado.'
      : 'auth_token utiliza Secure aunque la prueba local espera HTTP.',
  );

  const validSession = await request('/auth/me', {
    name: 'Sesión válida',
    headers: { Cookie: cookie },
  });
  assert(validSession.response.status === 200, 'La cookie válida no permitió consultar la sesión.');
  assert(validSession.json?.usuario?.correo_usuario === adminEmail, 'La sesión pertenece a otro usuario.');

  const altered = await request('/auth/me', {
    name: 'Cookie alterada',
    headers: { Cookie: `auth_token=${alterToken(token)}` },
  });
  assert(altered.response.status === 401, 'Una cookie alterada no devolvió 401.');
  assert(!altered.json?.usuario, 'La cookie alterada expuso información del usuario.');

  const expired = await request('/auth/me', {
    name: 'Cookie vencida',
    headers: { Cookie: `auth_token=${createExpiredToken(token)}` },
  });
  assert(expired.response.status === 401, 'Una cookie vencida no devolvió 401.');
  assert(!expired.json?.usuario, 'La cookie vencida expuso información del usuario.');

  const logout = await request('/auth/logout', {
    name: 'Cierre de sesión',
    method: 'POST',
    headers: { Cookie: cookie },
  });
  assert(logout.response.status === 200, 'El cierre de sesión no devolvió 200.');
  const clearCookie = (logout.response.headers.get('set-cookie') || '').toLowerCase();
  assert(clearCookie.includes('auth_token='), 'El logout no limpió auth_token.');
  assert(
    clearCookie.includes('expires=thu, 01 jan 1970') || clearCookie.includes('max-age=0'),
    'El logout no venció inmediatamente la cookie auth_token.',
  );

  const invalidated = await request('/auth/me', {
    name: 'Sesión invalidada',
    headers: { Cookie: cookie },
  });
  assert(invalidated.response.status === 401, 'La cookie siguió siendo válida después del logout.');

  console.log('PASS: controles de autenticación y sesión verificados.');
};

run().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
