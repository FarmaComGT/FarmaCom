const VentaDAO = require('../daos/VentaDAO');
const PromocionDAO = require('../daos/PromocionDAO');
const RecurrenteService = require('./RecurrenteService');
const { liberarReservasPagoPOS } = require('./VentaDetalleService');
const { aCentavos } = require('./VentaMonetariaService');
const {
  CODIGOS_ESTADO_PAGO_POS,
  ESTADOS_PAGO_POS,
  ESTADOS_FINALES_PAGO_POS,
  MONEDA_PAGO_POS,
} = require('./VentaPagoConstantes');

const EXPIRACION_PREDETERMINADA_MS = 3 * 60 * 1000;
const EXPIRACION_MINIMA_MS = 60 * 1000;
const EXPIRACION_MAXIMA_MS = 60 * 60 * 1000;
const LIMITE_POR_EJECUCION = 25;
const ESTADOS_PROVEEDOR_SIN_PAGO = new Map([
  ['canceled', ESTADOS_PAGO_POS.CANCELADO],
  ['superseded', ESTADOS_PAGO_POS.CANCELADO],
  ['failed', ESTADOS_PAGO_POS.FALLIDO],
]);

const obtenerExpiracionMs = (env = process.env) => {
  const valor = env.PAGO_POS_EXPIRACION_MS;
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return EXPIRACION_PREDETERMINADA_MS;
  }

  const normalizado = String(valor).trim();
  if (!/^\d+$/.test(normalizado)) {
    throw new Error('PAGO_POS_EXPIRACION_MS debe ser un entero entre 60000 y 3600000.');
  }

  const milisegundos = Number(normalizado);
  if (
    !Number.isSafeInteger(milisegundos)
    || milisegundos < EXPIRACION_MINIMA_MS
    || milisegundos > EXPIRACION_MAXIMA_MS
  ) {
    throw new Error('PAGO_POS_EXPIRACION_MS debe ser un entero entre 60000 y 3600000.');
  }
  return milisegundos;
};

const validarComando = (pago, comando) => {
  if (!comando || comando.external_id !== pago.external_id) {
    throw new Error('El comando de Recurrente no coincide con el pago POS local.');
  }
  if (
    comando.amount_in_cents != null
    && Number(comando.amount_in_cents) !== aCentavos(pago.total)
  ) {
    throw new Error('El monto del comando de Recurrente no coincide con el pago POS local.');
  }
  if (comando.currency && comando.currency !== MONEDA_PAGO_POS) {
    throw new Error('La moneda del comando de Recurrente no coincide con el pago POS local.');
  }
  if (comando.terminal_id && comando.terminal_id !== pago.terminal_id) {
    throw new Error('La terminal del comando de Recurrente no coincide con el pago POS local.');
  }
  return comando;
};

const guardarIdComandoRecuperado = async (pago, comando) => {
  if (pago.comando_recurrente_id || !comando.id) return;
  await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const actual = await VentaDAO.obtenerPagoPOSPorExternalId(pago.external_id, client, true);
    if (!actual || ESTADOS_FINALES_PAGO_POS.includes(actual.estado)) return;
    await VentaDAO.actualizarPagoPOS({
      external_id: pago.external_id,
      comando_recurrente_id: comando.id,
      estados_permitidos: [ESTADOS_PAGO_POS.PENDIENTE, ESTADOS_PAGO_POS.PROCESANDO],
    }, client);
  });
};

const obtenerComando = async (pago) => {
  const comando = pago.comando_recurrente_id
    ? await RecurrenteService.obtenerComandoTerminal(pago.comando_recurrente_id)
    : await RecurrenteService.crearComandoTerminal({
      terminalId: pago.terminal_id,
      totalCentavos: aCentavos(pago.total),
      externalId: pago.external_id,
    });
  validarComando(pago, comando);
  await guardarIdComandoRecuperado(pago, comando);
  return comando;
};

const registrarSeguimientoCancelacion = (pago, comando) => (
  VentaDAO.ejecutarEnTransaccion(async (client) => {
    const actual = await VentaDAO.obtenerPagoPOSPorExternalId(pago.external_id, client, true);
    if (!actual || ESTADOS_FINALES_PAGO_POS.includes(actual.estado)) return actual;
    return VentaDAO.actualizarPagoPOS({
      external_id: pago.external_id,
      estado: ESTADOS_PAGO_POS.PROCESANDO,
      estado_pago: comando.status === 'cancel_requested' || comando.cancellation_requested_at
        ? 'cancel_requested'
        : comando.status,
      comando_recurrente_id: comando.id || pago.comando_recurrente_id,
      estados_permitidos: [ESTADOS_PAGO_POS.PENDIENTE, ESTADOS_PAGO_POS.PROCESANDO],
    }, client);
  })
);

const finalizarSinPago = (pago, comando, estadoLocal) => (
  VentaDAO.ejecutarEnTransaccion(async (client) => {
    const actual = await VentaDAO.obtenerPagoPOSPorExternalId(pago.external_id, client, true);
    if (!actual || ESTADOS_FINALES_PAGO_POS.includes(actual.estado)) return actual;
    const actualizado = await VentaDAO.actualizarPagoPOS({
      external_id: pago.external_id,
      estado: estadoLocal,
      estado_pago: comando.status,
      comando_recurrente_id: comando.id || pago.comando_recurrente_id,
      estados_permitidos: [ESTADOS_PAGO_POS.PENDIENTE, ESTADOS_PAGO_POS.PROCESANDO],
    }, client);
    if (!actualizado) return actual;
    await liberarReservasPagoPOS(actual.id_pago_pos, client);
    await PromocionDAO.liberarUso({ id_pago_pos: actual.id_pago_pos }, client);
    return actualizado;
  })
);

const registrarConfirmacionPendiente = (pago, comando) => (
  VentaDAO.ejecutarEnTransaccion(async (client) => {
    const actual = await VentaDAO.obtenerPagoPOSPorExternalId(pago.external_id, client, true);
    if (!actual || ESTADOS_FINALES_PAGO_POS.includes(actual.estado)) return actual;
    return VentaDAO.registrarIncidenciaPagoPOS({
      external_id: pago.external_id,
      estado_pago: comando.status || 'consumed',
      referencia_pago: comando.checkout_id || comando.id,
      codigo_incidencia: CODIGOS_ESTADO_PAGO_POS.CONFIRMACION_REQUERIDA,
      detalle_incidencia: 'Recurrente reportó un cobro consumido sin webhook local; requiere conciliación.',
    }, client);
  })
);

const resolverComandoFinal = async (pago, comando) => {
  const estadoSinPago = ESTADOS_PROVEEDOR_SIN_PAGO.get(comando.status);
  if (estadoSinPago) return finalizarSinPago(pago, comando, estadoSinPago);
  return registrarConfirmacionPendiente(pago, comando);
};

const procesarPagoVencido = async (pago) => {
  let comando = await obtenerComando(pago);
  if (comando.final === true) return resolverComandoFinal(pago, comando);

  if (comando.status !== 'cancel_requested') {
    if (!comando.id) throw new Error('Recurrente no devolvió el identificador del comando POS.');
    comando = await RecurrenteService.cancelarComandoTerminal(comando.id);
    validarComando(pago, comando);
  }

  if (comando.final === true) return resolverComandoFinal(pago, comando);
  return registrarSeguimientoCancelacion(pago, comando);
};

const ejecutar = async ({ env = process.env, logger = console } = {}) => {
  const expiracionMs = obtenerExpiracionMs(env);
  const pagos = await VentaDAO.obtenerPagosPOSVencidos(expiracionMs, LIMITE_POR_EJECUCION);
  const resultados = [];

  for (const pago of pagos) {
    try {
      resultados.push(await procesarPagoVencido(pago));
    } catch (error) {
      logger.error(`No se pudo vencer el pago POS ${pago.id_pago_pos}: ${error.message}`);
    }
  }

  return { revisados: pagos.length, procesados: resultados.length };
};

module.exports = {
  ejecutar,
  obtenerExpiracionMs,
  procesarPagoVencido,
  validarComando,
};
