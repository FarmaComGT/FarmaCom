const crypto = require('crypto');
const VentaDAO = require('../daos/VentaDAO');
const RecurrenteService = require('./RecurrenteService');
const { lanzarError } = require('./VentaErrores');
const { validarPertenenciaSesionCaja } = require('../utils/accesoCaja');
const { aCentavos, aMonto } = require('./VentaMonetariaService');
const {
  validarAccesoSucursal,
  validarDatosBasicosVenta,
  validarSesionCaja,
  prepararVenta,
} = require('./VentaPreparacionService');
const {
  reservarDetallesPagoPOS,
  liberarReservasPagoPOS,
  registrarDetallesYConsumirReservas,
} = require('./VentaDetalleService');
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

const resolverTransicionPago = (estadoActual, estadoRecibido) => {
  if (ESTADOS_FINALES_PAGO_POS.includes(estadoActual)) return estadoActual;
  if (
    estadoActual === ESTADOS_PAGO_POS.PROCESANDO
    && estadoRecibido === ESTADOS_PAGO_POS.PENDIENTE
  ) return ESTADOS_PAGO_POS.PROCESANDO;
  return estadoRecibido;
};

const validarEventoPago = (evento, pago) => {
  const montoValido = Number(evento.amountInCents) === aCentavos(pago.total);
  const monedaValida = !evento.currency || evento.currency === MONEDA_PAGO_POS;
  const referenciaValida = Boolean(evento.referenciaPago);

  return montoValido && monedaValida && referenciaValida;
};

const registrarPagoRechazado = async (evento, codigoEstadoPago, client) => {
  const pago = await VentaDAO.obtenerPagoPOSPorExternalId(evento.externalId, client);
  if (pago) await liberarReservasPagoPOS(pago.id_pago_pos, client);
  const actualizado = await VentaDAO.actualizarPagoPOS({
    external_id: evento.externalId,
    estado: ESTADOS_PAGO_POS.RECHAZADO,
    estado_pago: codigoEstadoPago,
    evento_recurrente_id: evento.idEvento,
    referencia_pago: evento.referenciaPago,
  }, client);

  return { procesado: true, estado: actualizado.estado };
};

const completarVentaPagada = async (evento, pago, client, opciones = {}) => {
  const totalGuardadoCentavos = pago.detalles.reduce(
    (total, detalle) => total + aCentavos(detalle.precio_unitario) * Number(detalle.cantidad),
    0,
  );
  if (totalGuardadoCentavos !== aCentavos(pago.total)) {
    return registrarPagoRechazado(
      evento,
      CODIGOS_ESTADO_PAGO_POS.TOTAL_VENTA_INVALIDO,
      client,
    );
  }

  const venta = await VentaDAO.crearVenta({
    id_sucursal: Number(pago.id_sucursal),
    id_usuario: Number(pago.id_usuario),
    id_sesion_caja: Number(pago.id_sesion_caja),
    id_cliente: pago.id_cliente == null ? null : Number(pago.id_cliente),
    metodo_pago: METODOS_PAGO.TARJETA,
    proveedor_pago: PROVEEDOR_PAGO_POS,
    referencia_pago: evento.referenciaPago,
    estado_pago: ESTADOS_PAGO_POS.PAGADO,
    autorizacion_pago: evento.autorizacionPago,
    tarjeta_ultimos4: evento.tarjetaUltimos4,
    total: aMonto(totalGuardadoCentavos),
    monto_recibido: aMonto(totalGuardadoCentavos),
    cambio: '0.00',
  }, client);

  await registrarDetallesYConsumirReservas(
    venta.id_venta,
    pago,
    {
      id_usuario: pago.id_usuario,
      id_sucursal: pago.id_sucursal,
    },
    client,
  );

  const actualizado = opciones.idUsuarioConciliacion
    ? await VentaDAO.marcarPagoPOSConciliado({
      external_id: evento.externalId,
      id_venta: venta.id_venta,
      id_usuario_conciliacion: opciones.idUsuarioConciliacion,
    }, client)
    : await VentaDAO.actualizarPagoPOS({
      external_id: evento.externalId,
      estado: ESTADOS_PAGO_POS.PAGADO,
      estado_pago: evento.estado,
      evento_recurrente_id: evento.idEvento,
      referencia_pago: evento.referenciaPago,
      autorizacion_pago: evento.autorizacionPago,
      tarjeta_ultimos4: evento.tarjetaUltimos4,
      id_venta: venta.id_venta,
      estados_permitidos: [ESTADOS_PAGO_POS.PENDIENTE, ESTADOS_PAGO_POS.PROCESANDO],
    }, client);

  return {
    procesado: true,
    estado: actualizado.estado,
    id_venta: venta.id_venta,
  };
};

const detalleSeguroIncidencia = (error) => String(
  error?.message || 'No se pudo completar la venta local',
).replace(/\s+/g, ' ').trim().slice(0, 500);

const completarVentaORegistrarIncidencia = async (evento, pago, client) => {
  await VentaDAO.crearPuntoRestauracionVentaPOS(client);
  try {
    const resultado = await completarVentaPagada(evento, pago, client);
    await VentaDAO.liberarPuntoRestauracionVentaPOS(client);
    return resultado;
  } catch (error) {
    await VentaDAO.restaurarPuntoVentaPOS(client);
    await VentaDAO.liberarPuntoRestauracionVentaPOS(client);
    const actualizado = await VentaDAO.registrarIncidenciaPagoPOS({
      external_id: evento.externalId,
      estado_pago: evento.estado,
      evento_recurrente_id: evento.idEvento,
      referencia_pago: evento.referenciaPago,
      autorizacion_pago: evento.autorizacionPago,
      tarjeta_ultimos4: evento.tarjetaUltimos4,
      codigo_incidencia: CODIGOS_ESTADO_PAGO_POS.VENTA_INCOMPLETA,
      detalle_incidencia: detalleSeguroIncidencia(error),
    }, client);
    if (!actualizado) throw error;
    return {
      procesado: true,
      estado: ESTADOS_PAGO_POS.INCIDENCIA,
      incidencia: true,
      external_id: actualizado.external_id,
      referencia_pago: actualizado.referencia_pago,
    };
  }
};

const crearPagoPOS = async (datos, usuario) => {
  validarDatosBasicosVenta(datos, usuario);
  const terminalId = process.env.RECURRENTE_TERMINAL_ID;
  if (!terminalId) {
    const error = new Error('Configura RECURRENTE_TERMINAL_ID para procesar pagos con POS');
    error.status = 503;
    throw error;
  }

  const externalId = `${PREFIJO_EXTERNAL_ID_POS}${crypto.randomUUID()}`;
  const pago = await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const idSesionCaja = await validarSesionCaja(datos, usuario, client);
    const ventaPreparada = await prepararVenta(datos, usuario, client);
    const pagoCreado = await VentaDAO.crearPagoPOS({
      external_id: externalId,
      id_sucursal: ventaPreparada.id_sucursal,
      id_usuario: Number(usuario.id_usuario),
      id_sesion_caja: idSesionCaja,
      id_cliente: ventaPreparada.id_cliente,
      carrito_origen_id: datos.carrito_origen_id || null,
      terminal_id: terminalId,
      total: aMonto(ventaPreparada.totalCentavos),
      detalles: ventaPreparada.detallesCalculados,
    }, client);
    await reservarDetallesPagoPOS(
      pagoCreado.id_pago_pos,
      ventaPreparada.detallesCalculados,
      client,
    );
    return pagoCreado;
  });

  let comando;
  try {
    comando = await RecurrenteService.crearComandoTerminal({
      terminalId,
      totalCentavos: aCentavos(pago.total),
      externalId,
    });
  } catch (error) {
    if (error.resultadoIncierto) {
      const pagoIncierto = await VentaDAO.ejecutarEnTransaccion(async (client) => {
        const pagoActual = await VentaDAO.obtenerPagoPOSPorExternalId(externalId, client, true)
          || pago;
        if (ESTADOS_FINALES_PAGO_POS.includes(pagoActual.estado)) return pagoActual;
        const actualizado = await VentaDAO.actualizarPagoPOS({
          external_id: externalId,
          estado: ESTADOS_PAGO_POS.PROCESANDO,
          estado_pago: CODIGOS_ESTADO_PAGO_POS.RESPUESTA_INCIERTA,
          estados_permitidos: [ESTADOS_PAGO_POS.PENDIENTE, ESTADOS_PAGO_POS.PROCESANDO],
        }, client);
        return actualizado || pagoActual;
      });
      return {
        id_pago_pos: pagoIncierto.id_pago_pos,
        external_id: pagoIncierto.external_id,
        estado: pagoIncierto.estado,
        estado_pago: pagoIncierto.estado_pago,
        terminal_id: pagoIncierto.terminal_id,
        total: pagoIncierto.total,
        moneda: MONEDA_PAGO_POS,
        seguimiento_requerido: pagoIncierto.estado === ESTADOS_PAGO_POS.PROCESANDO,
      };
    }
    const resultadoError = await VentaDAO.ejecutarEnTransaccion(async (client) => {
      const pagoActual = await VentaDAO.obtenerPagoPOSPorExternalId(externalId, client, true)
        || pago;
      if (ESTADOS_FINALES_PAGO_POS.includes(pagoActual.estado)) {
        return { pago: pagoActual, yaFinalizado: true };
      }
      const actualizado = await VentaDAO.actualizarPagoPOS({
        external_id: externalId,
        estado: ESTADOS_PAGO_POS.FALLIDO,
        estado_pago: CODIGOS_ESTADO_PAGO_POS.ERROR_AL_INICIAR,
        estados_permitidos: [ESTADOS_PAGO_POS.PENDIENTE, ESTADOS_PAGO_POS.PROCESANDO],
      }, client);
      if (actualizado) await liberarReservasPagoPOS(pago.id_pago_pos, client);
      return { pago: actualizado || pagoActual, yaFinalizado: false };
    });
    if (resultadoError.yaFinalizado) {
      const pagoTrasError = resultadoError.pago;
      return {
        id_pago_pos: pagoTrasError.id_pago_pos,
        external_id: pagoTrasError.external_id,
        estado: pagoTrasError.estado,
        terminal_id: pagoTrasError.terminal_id,
        total: pagoTrasError.total,
        moneda: MONEDA_PAGO_POS,
      };
    }
    throw error;
  }

  const estadoComando = comando.status === ESTADOS_COMANDO_TERMINAL.ENVIADO
    ? ESTADOS_PAGO_POS.PROCESANDO
    : comando.status === ESTADOS_COMANDO_TERMINAL.FALLIDO
      ? ESTADOS_PAGO_POS.FALLIDO
      : ESTADOS_PAGO_POS.PENDIENTE;
  const pagoActualizado = await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const pagoActual = await VentaDAO.obtenerPagoPOSPorExternalId(externalId, client, true)
      || pago;
    if (ESTADOS_FINALES_PAGO_POS.includes(pagoActual.estado)) return pagoActual;
    const actualizado = await VentaDAO.actualizarPagoPOS({
      external_id: externalId,
      estado: estadoComando,
      comando_recurrente_id: comando.id || comando.command_id || null,
      estados_permitidos: [ESTADOS_PAGO_POS.PENDIENTE],
    }, client);
    if (actualizado && estadoComando === ESTADOS_PAGO_POS.FALLIDO) {
      await liberarReservasPagoPOS(pago.id_pago_pos, client);
    }
    return actualizado || pagoActual;
  });

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

    const estadoPago = resolverTransicionPago(
      pago.estado,
      determinarEstadoPago(evento.estado, evento.eventType),
    );
    if (estadoPago !== ESTADOS_PAGO_POS.PAGADO) {
      const actualizado = await VentaDAO.actualizarPagoPOS({
        external_id: evento.externalId,
        estado: estadoPago,
        estado_pago: evento.estado,
        evento_recurrente_id: evento.idEvento,
      }, client);
      if ([ESTADOS_PAGO_POS.FALLIDO, ESTADOS_PAGO_POS.CANCELADO].includes(estadoPago)) {
        await liberarReservasPagoPOS(pago.id_pago_pos, client);
      }
      return { procesado: true, estado: actualizado.estado };
    }

    if (!validarEventoPago(evento, pago)) {
      return registrarPagoRechazado(
        evento,
        CODIGOS_ESTADO_PAGO_POS.MONTO_O_MONEDA_INVALIDA,
        client,
      );
    }

    return completarVentaORegistrarIncidencia(evento, pago, client);
  });
};

const conciliarPagoPOS = async (externalId, usuario) => VentaDAO.ejecutarEnTransaccion(
  async (client) => {
    const pago = await VentaDAO.obtenerPagoPOSPorExternalId(externalId, client, true);
    if (!pago) lanzarError('Pago POS no encontrado', 404);
    validarAccesoSucursal(usuario, pago.id_sucursal);
    validarPertenenciaSesionCaja(usuario, { id_usuario_apertura: pago.id_usuario });

    if (pago.estado === ESTADOS_PAGO_POS.PAGADO && pago.id_venta) {
      return { procesado: true, recuperado: true, estado: pago.estado, id_venta: pago.id_venta };
    }
    if (pago.estado !== ESTADOS_PAGO_POS.INCIDENCIA) {
      lanzarError('El pago no tiene una incidencia pendiente de conciliacion', 409);
    }

    const resultado = await completarVentaPagada({
      externalId: pago.external_id,
      estado: pago.estado_pago,
      idEvento: pago.evento_recurrente_id,
      referenciaPago: pago.referencia_pago,
      autorizacionPago: pago.autorizacion_pago,
      tarjetaUltimos4: pago.tarjeta_ultimos4,
    }, pago, client, { idUsuarioConciliacion: Number(usuario.id_usuario) });

    return { ...resultado, conciliado: true };
  },
);

const obtenerEstadoPagoPOS = async (externalId, usuario) => {
  const pago = await VentaDAO.obtenerPagoPOSPorExternalId(externalId);
  if (!pago) lanzarError('Pago POS no encontrado', 404);
  validarAccesoSucursal(usuario, pago.id_sucursal);
  validarPertenenciaSesionCaja(usuario, {
    id_usuario_apertura: pago.id_usuario,
  });
  return {
    id_pago_pos: pago.id_pago_pos,
    external_id: pago.external_id,
    estado: pago.estado,
    estado_pago: pago.estado_pago,
    id_venta: pago.id_venta,
    total: pago.total,
    referencia_pago: pago.referencia_pago,
    autorizacion_pago: pago.autorizacion_pago,
    codigo_incidencia: pago.codigo_incidencia,
    detalle_incidencia: pago.detalle_incidencia,
    incidencia_en: pago.incidencia_en,
  };
};

module.exports = {
  validarEventoPago,
  determinarEstadoPago,
  resolverTransicionPago,
  registrarPagoRechazado,
  completarVentaPagada,
  completarVentaORegistrarIncidencia,
  crearPagoPOS,
  procesarWebhookRecurrente,
  conciliarPagoPOS,
  obtenerEstadoPagoPOS,
};
