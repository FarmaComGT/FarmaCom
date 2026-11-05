const AppError = require('../errors/AppError');

const obtenerConfiguracionCorreo = () => {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.CORREO_REMITENTE?.trim();
  const secure = process.env.SMTP_SECURE === 'true';
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';
  const requireTLS = process.env.SMTP_REQUIRE_TLS !== 'false';
  if (!host || !from || /[\r\n]/.test(from) || !Number.isInteger(port) || port < 1 || port > 65535
      || Boolean(user) !== Boolean(pass)
      || (process.env.NODE_ENV === 'production' && !secure && !requireTLS)) {
    throw new AppError('El servicio de correo no está configurado correctamente en el servidor', 503);
  }
  return { from, opciones: {
    host, port, secure, requireTLS, ...(user ? { auth: { user, pass } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true,
  } };
};
module.exports = { obtenerConfiguracionCorreo };
