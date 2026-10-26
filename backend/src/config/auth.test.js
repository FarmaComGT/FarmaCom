const cargarConfiguracion = (entorno = {}) => {
  const anterior = { ...process.env };
  Object.assign(process.env, entorno);
  for (const [clave, valor] of Object.entries(entorno)) {
    if (valor === undefined) delete process.env[clave];
  }

  let configuracion;
  jest.isolateModules(() => {
    configuracion = require('./auth');
  });

  process.env = anterior;
  return configuracion;
};

describe('configuración de autenticación', () => {
  it.each([
    ['8h', 8 * 60 * 60 * 1000],
    ['30m', 30 * 60 * 1000],
    ['2d', 2 * 24 * 60 * 60 * 1000],
    ['1w', 7 * 24 * 60 * 60 * 1000],
    ['45s', 45 * 1000],
    ['500ms', 500],
    [' 3600 ', 3600 * 1000],
  ])('convierte JWT_EXPIRES_IN=%p a milisegundos para la cookie', (valor, esperado) => {
    const { TOKEN_EXPIRY_MS, buildAuthCookieOptions } = cargarConfiguracion({ JWT_EXPIRES_IN: valor });

    expect(TOKEN_EXPIRY_MS).toBe(esperado);
    expect(buildAuthCookieOptions().maxAge).toBe(esperado);
  });

  it.each(['mañana', '10 años', ''])('usa 8 horas si JWT_EXPIRES_IN=%p no es válido', (valor) => {
    const { TOKEN_EXPIRY_MS } = cargarConfiguracion({ JWT_EXPIRES_IN: valor });

    expect(TOKEN_EXPIRY_MS).toBe(8 * 60 * 60 * 1000);
  });

  it('usa 8 horas cuando no se configura la expiración', () => {
    const { TOKEN_EXPIRY, TOKEN_EXPIRY_MS } = cargarConfiguracion({ JWT_EXPIRES_IN: undefined });

    expect(TOKEN_EXPIRY).toBe('8h');
    expect(TOKEN_EXPIRY_MS).toBe(8 * 60 * 60 * 1000);
  });

  it('emite una cookie httpOnly y estricta que no es secure fuera de producción', () => {
    const { COOKIE_NAME, buildAuthCookieOptions, buildAuthCookieClearOptions } = cargarConfiguracion({
      NODE_ENV: 'development',
    });

    expect(COOKIE_NAME).toBe('auth_token');
    expect(buildAuthCookieOptions()).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/', secure: false });
    expect(buildAuthCookieClearOptions()).toEqual({ httpOnly: true, secure: false, sameSite: 'strict', path: '/' });
  });

  it('marca la cookie como secure en producción', () => {
    const anterior = process.env.NODE_ENV;
    const { buildAuthCookieOptions, buildAuthCookieClearOptions } = cargarConfiguracion();
    process.env.NODE_ENV = 'production';

    try {
      expect(buildAuthCookieOptions().secure).toBe(true);
      expect(buildAuthCookieClearOptions().secure).toBe(true);
    } finally {
      process.env.NODE_ENV = anterior;
    }
  });
});
