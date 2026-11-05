const { obtenerConfiguracionCorreo } = require('./correo');
const original = process.env;
beforeEach(() => {
  process.env = { NODE_ENV: 'test', SMTP_HOST: 'localhost', SMTP_PORT: '1025',
    CORREO_REMITENTE: 'FarmaCom <reportes@farmacom.test>', SMTP_REQUIRE_TLS: 'false' };
});
afterEach(() => { process.env = original; });
test('configura el buzón local sin autenticación ni acceso a archivos', () => {
  expect(obtenerConfiguracionCorreo().opciones).toMatchObject({
    port: 1025, secure: false, requireTLS: false, disableFileAccess: true, disableUrlAccess: true,
  });
});
test.each(['SMTP_HOST', 'CORREO_REMITENTE'])('exige %s', (campo) => {
  delete process.env[campo];
  expect(obtenerConfiguracionCorreo).toThrow('no está configurado');
});
test('no permite desactivar TLS en producción', () => {
  process.env.NODE_ENV = 'production';
  expect(obtenerConfiguracionCorreo).toThrow('no está configurado');
  process.env.SMTP_REQUIRE_TLS = 'true';
  expect(obtenerConfiguracionCorreo().opciones.requireTLS).toBe(true);
});
test('no acepta credenciales incompletas', () => {
  process.env.SMTP_USER = 'usuario';
  expect(obtenerConfiguracionCorreo).toThrow('no está configurado');
});
