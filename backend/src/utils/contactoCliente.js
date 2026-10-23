const PATRON_TELEFONO = /^\+?[0-9]{8,15}$/;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LONGITUD_MAXIMA_CORREO = 150;

const normalizarTelefono = (numero) => String(numero ?? '').trim().replace(/[\s\-().]/g, '');

const normalizarCorreo = (correo) => String(correo ?? '').trim().toLowerCase();

const esTelefonoValido = (numero) => PATRON_TELEFONO.test(numero);

const esCorreoValido = (correo) => (
  correo.length <= LONGITUD_MAXIMA_CORREO && PATRON_CORREO.test(correo)
);

module.exports = {
  normalizarTelefono,
  normalizarCorreo,
  esTelefonoValido,
  esCorreoValido,
};
