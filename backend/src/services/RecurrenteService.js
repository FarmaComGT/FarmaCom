const crypto = require('crypto');
const {
  ESTADOS_RECURRENTE,
  MONEDA_PAGO_POS,
} = require('./VentaPagoConstantes');

const API_URL = process.env.RECURRENTE_API_URL || 'https://app.recurrente.com/api';
const MINIMO_GTQ_CENTAVOS = 500;
const TOLERANCIA_FIRMA_SEGUNDOS = 300;

const lanzarError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

const obtenerLlaveSecreta = () => {
  const llave = process.env.RECURRENTE_SECRET_KEY;
  if (!llave) {
    lanzarError('Configura RECURRENTE_SECRET_KEY para procesar pagos con tarjeta', 503);
  }
  return llave;
};

const obtenerFetch = () => {
  if (typeof fetch !== 'function') {
    lanzarError('El runtime de Node no soporta fetch para conectar con Recurrente', 500);
  }
  return fetch;
};

const leerRespuesta = async (respuesta) => {
  const texto = await respuesta.text();
  if (!texto) return {};

  try {
    return JSON.parse(texto);
  } catch (error) {
    return { error: texto };
  }
};

const formatearErrores = (errores) => {
  if (!errores || typeof errores !== 'object') return null;

  const detalles = Object.values(errores)
    .flat()
    .filter(Boolean);

  return detalles.length > 0 ? detalles.join('. ') : null;
};

const solicitar = async (ruta, opciones = {}) => {
  const respuesta = await obtenerFetch()(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      'X-SECRET-KEY': obtenerLlaveSecreta(),
      'Content-Type': 'application/json',
      ...(opciones.headers || {}),
    },
  });
  const data = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    const detalle = formatearErrores(data.errors);
    const mensajeBase = data.error || data.message || 'Recurrente no pudo procesar la solicitud';
    const mensaje = detalle ? `${mensajeBase}: ${detalle}` : mensajeBase;
    lanzarError(mensaje, respuesta.status || 502);
  }

  return data;
};

const crearComandoTerminal = async ({ terminalId, totalCentavos, externalId }) => {
  if (totalCentavos < MINIMO_GTQ_CENTAVOS) {
    lanzarError('Recurrente requiere un monto minimo de Q5.00 para pagos en GTQ', 400);
  }

  if (!terminalId) {
    lanzarError('Configura RECURRENTE_TERMINAL_ID para procesar pagos con POS', 503);
  }

  if (!externalId) {
    lanzarError('external_id es requerido para crear el comando POS', 400);
  }

  return solicitar('/terminal_session_commands', {
    method: 'POST',
    body: JSON.stringify({
      terminal_id: terminalId,
      amount_in_cents: totalCentavos,
      currency: MONEDA_PAGO_POS,
      external_id: externalId,
    }),
  });
};

const obtenerSecretoWebhook = () => {
  const secreto = process.env.RECURRENTE_WEBHOOK_SECRET;
  if (!secreto) {
    lanzarError('Configura RECURRENTE_WEBHOOK_SECRET para validar webhooks', 503);
  }
  return secreto;
};

const obtenerHeader = (headers, nombre) => (
  headers?.[nombre] || headers?.[nombre.toLowerCase()] || null
);

const verificarFirmaWebhook = (body, headers) => {
  const secreto = obtenerSecretoWebhook();
  const svixId = obtenerHeader(headers, 'svix-id');
  const timestamp = obtenerHeader(headers, 'svix-timestamp');
  const firmas = obtenerHeader(headers, 'svix-signature');

  if (!svixId || !timestamp || !firmas) {
    lanzarError('Faltan headers de firma del webhook', 401);
  }

  const timestampNumero = Number(timestamp);
  if (!Number.isInteger(timestampNumero)) {
    lanzarError('El timestamp del webhook no es valido', 401);
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumero) > TOLERANCIA_FIRMA_SEGUNDOS) {
    lanzarError('El webhook esta fuera de la ventana de tiempo permitida', 401);
  }

  const secretoBase64 = secreto.startsWith('whsec_') ? secreto.slice(6) : secreto;
  const secretoBytes = Buffer.from(secretoBase64, 'base64');
  if (secretoBytes.length === 0) {
    lanzarError('RECURRENTE_WEBHOOK_SECRET no tiene un formato valido', 503);
  }

  const cuerpo = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ''));
  const contenidoFirmado = `${svixId}.${timestamp}.${cuerpo.toString('utf8')}`;
  const firmaEsperada = crypto
    .createHmac('sha256', secretoBytes)
    .update(contenidoFirmado)
    .digest('base64');

  const firmaValida = String(firmas)
    .split(' ')
    .map((firma) => firma.replace(/^v\d+,/, ''))
    .some((firma) => {
      const recibida = Buffer.from(firma);
      const esperada = Buffer.from(firmaEsperada);
      return recibida.length === esperada.length
        && crypto.timingSafeEqual(recibida, esperada);
    });

  if (!firmaValida) {
    lanzarError('Firma de webhook invalida', 401);
  }

  return true;
};

const parsearWebhook = (body) => {
  try {
    return JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : body);
  } catch (error) {
    lanzarError('El body del webhook no contiene JSON valido', 400);
  }
};

const normalizarEventoWebhook = (body) => {
  const payload = typeof body === 'object' && !Buffer.isBuffer(body)
    ? body
    : parsearWebhook(body);
  const datos = payload.data && typeof payload.data === 'object'
    ? { ...payload.data, event_type: payload.event || payload.event_type || payload.data.event_type }
    : payload;
  const checkout = datos.checkout || {};
  const metadata = checkout.metadata || datos.metadata || {};
  const payment = datos.payment || {};
  const detalles = datos.details || {};
  const eventType = datos.event_type || payload.event_type || payload.event;
  const estado = datos.status || (
    eventType?.endsWith(`.${ESTADOS_RECURRENTE.EXITOSO}`)
      ? ESTADOS_RECURRENTE.EXITOSO
      : eventType?.endsWith(`.${ESTADOS_RECURRENTE.FALLIDO}`)
        ? ESTADOS_RECURRENTE.FALLIDO
        : eventType?.endsWith(`.${ESTADOS_RECURRENTE.CANCELADO}`)
          ? ESTADOS_RECURRENTE.CANCELADO
          : ESTADOS_RECURRENTE.PENDIENTE
  );

  return {
    idEvento: payload.id || datos.id || null,
    eventType,
    estado,
    externalId: metadata.external_id || datos.external_id || null,
    referenciaPago: datos.id || payment.id || checkout.id || null,
    amountInCents: datos.amount_in_cents ?? checkout.amount_in_cents ?? null,
    currency: datos.currency || checkout.currency || null,
    autorizacionPago: datos.authorization_code
      || datos.auth_code
      || detalles.authorization_code
      || detalles.auth_code
      || payment.authorization_code
      || payment.auth_code
      || null,
    tarjetaUltimos4: datos.payment_method?.card?.last4
      || payment.payment_method?.card?.last4
      || payment.card?.last4
      || null,
  };
};

module.exports = {
  crearComandoTerminal,
  verificarFirmaWebhook,
  normalizarEventoWebhook,
};
