const apiUrl = String(process.env.SECURITY_API_URL || '').replace(/\/+$/, '');
const targetEnv = String(process.env.SECURITY_TARGET_ENV || '');
const adminEmail = String(process.env.SECURITY_ADMIN_EMAIL || '').trim();
const adminPassword = String(process.env.SECURITY_ADMIN_PASSWORD || '');
const dependentEmail = String(process.env.SECURITY_DEPENDENT_EMAIL || '').trim();
const dependentPassword = String(process.env.SECURITY_DEPENDENT_PASSWORD || '');

const readPositiveInteger = (name) => {
  const value = Number(process.env[name]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return value;
};

const ownBranchId = readPositiveInteger('SECURITY_OWN_BRANCH_ID');
const foreignBranchId = readPositiveInteger('SECURITY_FOREIGN_BRANCH_ID');
const foreignLotId = readPositiveInteger('SECURITY_FOREIGN_LOT_ID');
const foreignSaleId = readPositiveInteger('SECURITY_FOREIGN_SALE_ID');
const foreignRegisterId = readPositiveInteger('SECURITY_FOREIGN_REGISTER_ID');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const validateConfiguration = () => {
  assert(
    targetEnv === 'local',
    'Las comprobaciones de autorización solo admiten el ambiente local.',
  );
  assert(
    /^http:\/\/(backend|host\.docker\.internal):3000\/api$/i.test(apiUrl),
    'SECURITY_API_URL debe apuntar al backend local autorizado.',
  );

  const missing = [];
  if (!adminEmail) missing.push('SECURITY_ADMIN_EMAIL');
  if (!adminPassword) missing.push('SECURITY_ADMIN_PASSWORD');
  if (!dependentEmail) missing.push('SECURITY_DEPENDENT_EMAIL');
  if (!dependentPassword) missing.push('SECURITY_DEPENDENT_PASSWORD');
  assert(missing.length === 0, `Faltan variables requeridas: ${missing.join(', ')}`);
  assert(
    ownBranchId !== foreignBranchId,
    'SECURITY_OWN_BRANCH_ID y SECURITY_FOREIGN_BRANCH_ID deben ser diferentes.',
  );
};

const request = async (path, cookie, name) => {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      Cookie: cookie,
    },
    redirect: 'manual',
  });
  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`${name} devolvió un cuerpo que no es JSON.`);
    }
  }

  return { status: response.status, json };
};

const login = async (email, password, expectedRole) => {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ correo_usuario: email, contrasena: password }),
    redirect: 'manual',
  });
  const json = await response.json();
  assert(response.status === 200, `No fue posible iniciar sesión como ${expectedRole}.`);
  assert(json?.usuario?.rol === expectedRole, `La cuenta configurada no tiene rol ${expectedRole}.`);

  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(/(?:^|,\s*)auth_token=([^;]+)/i);
  assert(match, `El login de ${expectedRole} no devolvió auth_token.`);
  return {
    cookie: `auth_token=${match[1]}`,
    user: json.usuario,
  };
};

const assertStatus = (result, expected, name) => {
  assert(
    result.status === expected,
    `${name}: se esperaba ${expected} y se recibió ${result.status}.`,
  );
};

const assertDenied = (result, name) => {
  assertStatus(result, 403, name);
  assert(
    result.json && !Array.isArray(result.json) && typeof result.json === 'object',
    `${name}: la respuesta 403 no tiene el formato esperado.`,
  );
  assert(
    typeof result.json.mensaje === 'string' && result.json.mensaje.length > 0,
    `${name}: la respuesta 403 no contiene un mensaje genérico.`,
  );
  assert(
    Object.keys(result.json).every((key) => key === 'mensaje'),
    `${name}: la respuesta 403 expuso campos adicionales.`,
  );
};

const assertBranch = (resource, expectedBranchId, name) => {
  assert(resource && typeof resource === 'object', `${name}: no devolvió un recurso.`);
  assert(
    Number(resource.id_sucursal) === expectedBranchId,
    `${name}: el recurso no pertenece a la sucursal ${expectedBranchId}.`,
  );
};

const runCases = async (cases) => {
  const failures = [];

  for (const testCase of cases) {
    try {
      const result = await request(testCase.path, testCase.cookie, testCase.name);
      if (testCase.expectedStatus === 403) {
        assertDenied(result, testCase.name);
      } else {
        assertStatus(result, testCase.expectedStatus, testCase.name);
      }
      console.log(`PASS: ${testCase.name}`);
    } catch (error) {
      failures.push(error.message);
      console.error(`FAIL: ${error.message}`);
    }
  }

  assert(
    failures.length === 0,
    `${failures.length} comprobación(es) de autorización fallaron.`,
  );
};

const run = async () => {
  validateConfiguration();
  const admin = await login(adminEmail, adminPassword, 'administrador');
  const dependent = await login(dependentEmail, dependentPassword, 'dependiente');
  const adminCookie = admin.cookie;
  const dependentCookie = dependent.cookie;

  const dependentSession = await request(
    '/auth/me',
    dependentCookie,
    'Sesión del dependiente',
  );
  assertStatus(dependentSession, 200, 'Sesión del dependiente');
  assert(
    Number(dependentSession.json?.usuario?.id_sucursal) === ownBranchId,
    'El dependiente no pertenece a SECURITY_OWN_BRANCH_ID.',
  );

  const foreignLot = await request(
    `/lotes/${foreignLotId}`,
    adminCookie,
    'Lote ajeno de referencia',
  );
  assertStatus(foreignLot, 200, 'Lote ajeno de referencia');
  assertBranch(foreignLot.json, foreignBranchId, 'Lote ajeno de referencia');

  const foreignSale = await request(
    `/ventas/${foreignSaleId}`,
    adminCookie,
    'Venta ajena de referencia',
  );
  assertStatus(foreignSale, 200, 'Venta ajena de referencia');
  assertBranch(foreignSale.json, foreignBranchId, 'Venta ajena de referencia');

  const foreignRegisters = await request(
    `/cajas?id_sucursal=${foreignBranchId}`,
    adminCookie,
    'Caja ajena de referencia',
  );
  assertStatus(foreignRegisters, 200, 'Caja ajena de referencia');
  assert(Array.isArray(foreignRegisters.json), 'La consulta administrativa de cajas no devolvió una lista.');
  const foreignRegister = foreignRegisters.json.find(
    (register) => Number(register.id_caja) === foreignRegisterId,
  );
  assertBranch(foreignRegister, foreignBranchId, 'Caja ajena de referencia');

  const verticalCases = [
    ['/usuarios', 'usuarios'],
    ['/reportes/ventas/resumen', 'reportes financieros'],
    ['/cajas/cierres', 'cierres de caja'],
    ['/lotes/alertas', 'alertas globales de lotes'],
  ].flatMap(([path, capability]) => [
    {
      name: `Administrador puede consultar ${capability}`,
      path,
      cookie: adminCookie,
      expectedStatus: 200,
    },
    {
      name: `Dependiente no puede consultar ${capability}`,
      path,
      cookie: dependentCookie,
      expectedStatus: 403,
    },
  ]);

  const ownBranchCases = [
    [`/usuarios/${dependent.user.id_usuario}`, 'su propio usuario'],
    [`/sucursales/${ownBranchId}/inventario`, 'inventario propio'],
    [`/sucursales/${ownBranchId}/inventario/resumen`, 'resumen de inventario propio'],
    [`/lotes/sucursal/${ownBranchId}`, 'lotes propios'],
    [`/cajas?id_sucursal=${ownBranchId}`, 'cajas propias'],
    [`/ventas?id_sucursal=${ownBranchId}`, 'ventas propias'],
  ].map(([path, resource]) => ({
    name: `Dependiente puede consultar ${resource}`,
    path,
    cookie: dependentCookie,
    expectedStatus: 200,
  }));

  const crossBranchCases = [
    [`/usuarios/${admin.user.id_usuario}`, 'otro usuario por identificador'],
    [`/sucursales/${foreignBranchId}/inventario`, 'inventario de otra sucursal'],
    [`/sucursales/${foreignBranchId}/inventario/resumen`, 'resumen de otra sucursal'],
    [`/lotes/sucursal/${foreignBranchId}`, 'lotes de otra sucursal'],
    [`/cajas?id_sucursal=${foreignBranchId}`, 'cajas de otra sucursal'],
    [`/ventas?id_sucursal=${foreignBranchId}`, 'ventas de otra sucursal'],
    [`/lotes/${foreignLotId}`, 'lote ajeno por identificador'],
    [`/ventas/${foreignSaleId}`, 'venta ajena por identificador'],
    [`/cajas/${foreignRegisterId}/sesion-actual`, 'caja ajena por identificador'],
  ].map(([path, resource]) => ({
    name: `Dependiente no puede consultar ${resource}`,
    path,
    cookie: dependentCookie,
    expectedStatus: 403,
  }));

  await runCases([...verticalCases, ...ownBranchCases, ...crossBranchCases]);
  console.log('PASS: autorización por rol y aislamiento entre sucursales verificados.');
};

run().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
