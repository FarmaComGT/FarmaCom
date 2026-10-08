const crypto = require('crypto');
const VentaDAO = require('../daos/VentaDAO');
const RecurrenteService = require('./RecurrenteService');
const { lanzarError } = require('./VentaErrores');
const { aCentavos, aMonto } = require('./VentaMonetariaService');
const {
  validarAccesoSucursal,
  validarDatosBasicosVenta,
  validarSesionCaja,
  prepararVenta,
} = require('./VentaPreparacionService');
const { registrarDetallesYDescontarStock } = require('./VentaDetalleService');
const {
  METODOS_PAGO,
  ESTADOS_PAGO_POS,
  ESTADOS_FINALES_PAGO_POS,
  ESTADOS_RECURRENTE,
  ESTADOS_COMANDO_TERMINAL,
  CODIGOS_ESTADO_PAGO_POS,
  MONEDA_PAGO_POS,
  PROVEEDOR_PAGO_POS,
  PREFIJO_EXTERNAL_ID_POS,
} = require('./VentaPagoConstantes');

const determinarEstadoPago = (estado, tipoEvento) => {
  if (
    estado === ESTADOS_RECURRENTE.EXITOSO
    || tipoEvento?.endsWith(`.${ESTADOS_RECURRENTE.EXITOSO}`)
  ) return ESTADOS_PAGO_POS.PAGADO;

  if (
    estado === ESTADOS_RECURRENTE.FALLIDO
    || tipoEvento?.endsWith(`.${ESTADOS_RECURRENTE.FALLIDO}`)
  ) return ESTADOS_PAGO_POS.FALLIDO;

  if (
    estado === ESTADOS_RECURRENTE.CANCELADO
    || tipoEvento?.endsWith(`.${ESTADOS_RECURRENTE.CANCELADO}`)
  ) return ESTADOS_PAGO_POS.CANCELADO;

  return ESTADOS_PAGO_POS.PENDIENTE;
};

const validarEventoPago = (evento, pago) => {
  const montoValido = Number(evento.amountInCents) === aCentavos(pago.total);
  const monedaValida = !evento.currency || evento.currency === MONEDA_PAGO_POS;
  const referenciaValida = Boolean(evento.referenciaPago);

  return montoValido && monedaValida && referenciaValida;
};

const registrarPagoRechazado = async (evento, codigoEstadoPago, client) => {
  const actualizado = await VentaDAO.actualizarPagoPOS({
    external_id: evento.externalId,
    estado: ESTADOS_PAGO_POS.RECHAZADO,
    estado_pago: codigoEstadoPago,
    evento_recurrente_id: evento.idEvento,
    referencia_pago: evento.referenciaPago,
  }, client);

  return { procesado: true, estado: actualizado.estado };
};

const completarVentaPagada = async (evento, pago, client) => {
  const datosVenta = {
    id_sucursal: pago.id_sucursal,
    id_sesion_caja: pago.id_sesion_caja,
    id_cliente: pago.id_cliente,
    detalles: pago.detalles,
  };
  const usuarioSistema = {
    id_usuario: pago.id_usuario,
    rol: 'dueno',
  };

  let ventaPreparada;
  try {
    ventaPreparada = await prepararVenta(datosVenta, usuarioSistema, client);
  } catch (error) {
    return registrarPagoRechazado(
      evento,
      CODIGOS_ESTADO_PAGO_POS.INVENTARIO_NO_DISPONIBLE,
      client,
    );
  }

  if (ventaPreparada.totalCentavos !== aCentavos(pago.total)) {
    return registrarPagoRechazado(
      evento,
      CODIGOS_ESTADO_PAGO_POS.TOTAL_VENTA_INVALIDO,
      client,
    );
  }

  const venta = await VentaDAO.crearVenta({
    id_sucursal: ventaPreparada.id_sucursal,
    id_usuario: Number(pago.id_usuario),
    id_sesion_caja: Number(pago.id_sesion_caja),
    id_cliente: ventaPreparada.id_cliente,
    metodo_pago: METODOS_PAGO.TARJETA,
    proveedor_pago: PROVEEDOR_PAGO_POS,
    referencia_pago: evento.referenciaPago,
    estado_pago: ESTADOS_PAGO_POS.PAGADO,
    autorizacion_pago: evento.autorizacionPago,
    tarjeta_ultimos4: evento.tarjetaUltimos4,
    total: aMonto(ventaPreparada.totalCentavos),
    monto_recibido: aMonto(ventaPreparada.totalCentavos),
    cambio: '0.00',
  }, client);

  await registrarDetallesYDescontarStock(
    venta.id_venta,
    ventaPreparada.detallesCalculados,
    client,
  );

  const actualizado = await VentaDAO.actualizarPagoPOS({
    external_id: evento.externalId,
    estado: ESTADOS_PAGO_POS.PAGADO,
    estado_pago: evento.estado,
    evento_recurrente_id: evento.idEvento,
    referencia_pago: evento.referenciaPago,
    autorizacion_pago: evento.autorizacionPago,
    tarjeta_ultimos4: evento.tarjetaUltimos4,
    id_venta: venta.id_venta,
  }, client);

  return {
    procesado: true,
    estado: actualizado.estado,
    id_venta: venta.id_venta,
  };
};

const crearPagoPOS = async (datos, usuario) => {
  validarDatosBasicosVenta(datos, usuario);
  const terminalId = process.env.RECURRENTE_TERMINAL_ID;
  if (!terminalId) {
    lanzarError('Configura RECURRENTE_TERMINAL_ID para procesar pagos con POS', 503);
  }

  const externalId = `${PREFIJO_EXTERNAL_ID_POS}${crypto.randomUUID()}`;
  const pago = await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const idSesionCaja = await validarSesionCaja(datos, usuario, client);
    const ventaPreparada = await prepararVenta(datos, usuario, client);
    return VentaDAO.crearPagoPOS({
      external_id: externalId,
      id_sucursal: ventaPreparada.id_sucursal,
      id_usuario: Number(usuario.id_usuario),
      id_sesion_caja: idSesionCaja,
      id_cliente: ventaPreparada.id_cliente,
      terminal_id: terminalId,
      total: aMonto(ventaPreparada.totalCentavos),
      detalles: ventaPreparada.detallesCalculados,
    }, client);
  });

  let comando;
  try {
    comando = await RecurrenteService.crearComandoTerminal({
      terminalId,
      totalCentavos: aCentavos(pago.total),
      externalId,
    });
  } catch (error) {
    await VentaDAO.ejecutarEnTransaccion((client) => VentaDAO.actualizarPagoPOS({
      external_id: externalId,
      estado: ESTADOS_PAGO_POS.FALLIDO,
      estado_pago: CODIGOS_ESTADO_PAGO_POS.ERROR_AL_INICIAR,
    }, client));
    throw error;
  }

  const estadoComando = comando.status === ESTADOS_COMANDO_TERMINAL.ENVIADO
    ? ESTADOS_PAGO_POS.PROCESANDO
    : comando.status === ESTADOS_COMANDO_TERMINAL.FALLIDO
      ? ESTADOS_PAGO_POS.FALLIDO
      : ESTADOS_PAGO_POS.PENDIENTE;
  const pagoActualizado = await VentaDAO.ejecutarEnTransaccion((client) => (
    VentaDAO.actualizarPagoPOS({
      external_id: externalId,
      estado: estadoComando,
      comando_recurrente_id: comando.id || comando.command_id || null,
    }, client)
  ));

  return {
    id_pago_pos: pagoActualizado.id_pago_pos,
    external_id: pagoActualizado.external_id,
    estado: pagoActualizado.estado,
    terminal_id: pagoActualizado.terminal_id,
    total: pagoActualizado.total,
    moneda: MONEDA_PAGO_POS,
  };
};

const procesarWebhookRecurrente = async (body, headers) => {
  RecurrenteService.verificarFirmaWebhook(body, headers);
  const evento = RecurrenteService.normalizarEventoWebhook(body);

  if (!evento.externalId) {
    return { procesado: false, razon: 'Evento sin external_id de FarmaCom' };
  }

  return VentaDAO.ejecutarEnTransaccion(async (client) => {
    const pago = await VentaDAO.obtenerPagoPOSPorExternalId(
      evento.externalId,
      client,
      true,
    );
    if (!pago) {
      return { procesado: false, razon: 'Pago POS no encontrado' };
    }

    if (ESTADOS_FINALES_PAGO_POS.includes(pago.estado)) {
      return {
        procesado: true,
        duplicado: pago.estado === ESTADOS_PAGO_POS.PAGADO,
        estado: pago.estado,
        id_venta: pago.id_venta,
      };
    }

    const estadoPago = determinarEstadoPago(evento.estado, evento.eventType);
    if (estadoPago !== ESTADOS_PAGO_POS.PAGADO) {
      const actualizado = await VentaDAO.actualizarPagoPOS({
        external_id: evento.externalId,
        estado: estadoPago,
        estado_pago: evento.estado,
        evento_recurrente_id: evento.idEvento,
      }, client);
      return { procesado: true, estado: actualizado.estado };
    }

    if (!validarEventoPago(evento, pago)) {
      return registrarPagoRechazado(
        evento,
        CODIGOS_ESTADO_PAGO_POS.MONTO_O_MONEDA_INVALIDA,
        client,
      );
    }

    return completarVentaPagada(evento, pago, client);
  });
};

const obtenerEstadoPagoPOS = async (externalId, usuario) => {
  const pago = await VentaDAO.obtenerPagoPOSPorExternalId(externalId);
  if (!pago) lanzarError('Pago POS no encontrado', 404);
  validarAccesoSucursal(usuario, pago.id_sucursal);
  return {
    id_pago_pos: pago.id_pago_pos,
    external_id: pago.external_id,
    estado: pago.estado,
    estado_pago: pago.estado_pago,
    id_venta: pago.id_venta,
    total: pago.total,
  };
};

module.exports = {
  validarEventoPago,
  determinarEstadoPago,
  registrarPagoRechazado,
  completarVentaPagada,
  crearPagoPOS,
  procesarWebhookRecurrente,
  obtenerEstadoPagoPOS,
};
