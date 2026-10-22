const request = require('supertest');
const app = require('./app');

describe('configuración HTTP segura', () => {
  it('no confía en proxies si no fueron configurados', () => {
    expect(app.get('trust proxy')).toBe(false);
  });

  it('publica encabezados de seguridad y oculta Express', async () => {
    const respuesta = await request(app).get('/api/ping').expect(200);

    expect(respuesta.headers).not.toHaveProperty('x-powered-by');
    expect(respuesta.headers).toEqual(expect.objectContaining({
      'content-security-policy': expect.any(String),
      'cross-origin-opener-policy': 'same-origin',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': expect.stringContaining('max-age='),
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
    }));
  });
});
