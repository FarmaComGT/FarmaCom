const { parseSecurityConfig } = require('./security');

describe('configuración de seguridad', () => {
  it('utiliza valores restrictivos por defecto', () => {
    expect(parseSecurityConfig({})).toEqual({
      trustProxyHops: 0,
      loginRateLimitWindowMs: 15 * 60 * 1000,
      loginRateLimitMaxAttempts: 5,
    });
  });

  it('acepta ajustes explícitos dentro de rangos seguros', () => {
    expect(parseSecurityConfig({
      TRUST_PROXY_HOPS: '1',
      LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '3',
    })).toEqual({
      trustProxyHops: 1,
      loginRateLimitWindowMs: 60000,
      loginRateLimitMaxAttempts: 3,
    });
  });

  it.each([
    ['TRUST_PROXY_HOPS', 'true'],
    ['TRUST_PROXY_HOPS', '11'],
    ['LOGIN_RATE_LIMIT_WINDOW_MS', '999'],
    ['LOGIN_RATE_LIMIT_MAX_ATTEMPTS', '0'],
  ])('rechaza %s=%s', (nombre, valor) => {
    expect(() => parseSecurityConfig({ [nombre]: valor })).toThrow(nombre);
  });
});
