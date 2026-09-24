const crypto = require('crypto');
const VentaDAO = require('../daos/VentaDAO');
const CajaDAO = require('../daos/CajaDAO');
const RecurrenteService = require('./RecurrenteService');

const MAXIMO_CENTAVOS = 999999999999;
const METODOS_PERMITIDOS = ['efectivo'];

const lanzarError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

const aCentavos = (monto) => Math.round(Number(monto) * 100);
const aMonto = (centavos) => (centavos / 100).toFixed(2);

const puedeAccederSucursal = (usuario, id_sucursal) => (
  usuario.rol !== 'dependiente'
  || Number(usuario.id_sucursal) === Number(id_sucursal)
);

const validarAccesoSucursal = (usuario, id_sucursal) => {
  if (!puedeAccederSucursal(usuario, id_sucursal)) {
    lanzarError('No tienes permiso para operar ventas de otra sucursal', 403);
  }
};

const verificarCliente = async (id_cliente, client) => {
  if (id_cliente == null) return;
  const cliente = await VentaDAO.obtenerClientePorId(id_cliente, client);
  if (!cliente) lanzarError('Cliente no encontrado', 404);
};

const obtenerVentaAutorizada = async (id_venta, usuario) => {
  const venta = await VentaDAO.obtenerPorId(id_venta);
  if (!venta) lanzarError('Venta no encontrada', 404);
  validarAccesoSucursal(usuario, venta.id_sucursal);
  return venta;
};

const validarDatosBasicosVenta = (datos, usuario) => {
  const {
    id_sucursal,
    detalles,
  } = datos;

  validarAccesoSucursal(usuario, id_sucursal);

  const idsLote = detalles.map(({ id_lote }) => Number(id_lote));
  if (new Set(idsLote).size !== idsLote.length) {
    lanzarError('Cada lote debe aparecer una sola vez en los detalles de la venta', 400);
  }

  return idsLote;
};

const validarSesionCaja = async (datos, usuario, client) => {
  const sesion = await CajaDAO.obtenerSesionPorId(
    Number(datos.id_sesion_caja),
    client,
    'share',
  );

  if (!sesion) lanzarError('Sesión de caja no encontrada', 404);
  validarAccesoSucursal(usuario, sesion.id_sucursal);
  if (Number(sesion.id_sucursal) !== Number(datos.id_sucursal)) {
    lanzarError('La sesión de caja no pertenece a la sucursal de la venta', 409);
  }
  if (sesion.estado !== 'abierta') {
    lanzarError('La sesión de caja está cerrada', 409);
  }

  return Number(sesion.id_sesion_caja);
};

const prepararVenta = async (datos, usuario, client) => {
  const {
    id_sucursal,
    id_cliente = null,
    detalles,
  } = datos;
  const idsLote = validarDatosBasicosVenta(datos, usuario);

  await verificarCliente(id_cliente, client);

  const lotes = await VentaDAO.obtenerLotesParaVenta(
    [...idsLote].sort((a, b) => a - b),
    client,
  );

  if (lotes.length !== idsLote.length) {
    lanzarError('Uno o mas lotes no existen', 404);
  }

  const lotesPorId = new Map(lotes.map((lote) => [Number(lote.id_lote), lote]));
  let totalCentavos = 0;
  const detallesCalculados = detalles.map(({ id_lote, cantidad }) => {
    const lote = lotesPorId.get(Number(id_lote));

    if (Number(lote.id_sucursal) !== Number(id_sucursal)) {
      lanzarError(`El lote ${id_lote} no pertenece a la sucursal indicada`, 409);
    }
    if (!lote.producto_activo) {
      lanzarError(`El producto del lote ${id_lote} esta inactivo`, 409);
    }
    if (lote.vencido) {
      lanzarError(`No se puede vender el lote ${id_lote} porque esta vencido`, 409);
    }
    if (Number(lote.stock_actual) < Number(cantidad)) {
      lanzarError(`Stock insuficiente para el lote ${id_lote}`, 409);
    }

    const precioCentavos = aCentavos(lote.precio_venta);
    const costoCentavos = aCentavos(lote.precio_compra);
    const subtotalCentavos = precioCentavos * Number(cantidad);
    if (
      !Number.isSafeInteger(subtotalCentavos)
      || totalCentavos + subtotalCentavos > MAXIMO_CENTAVOS
    ) {
      lanzarError('El total de la venta supera el monto maximo permitido', 400);
    }
    totalCentavos += subtotalCentavos;

    return {
      id_lote: Number(id_lote),
      cantidad: Number(cantidad),
      precio_unitario: aMonto(precioCentavos),
      costo_unitario: aMonto(costoCentavos),
    };
  });

  if (totalCentavos <= 0) {
    lanzarError('El total de la venta debe ser mayor a cero', 400);
  }

  return {
    id_sucursal: Number(id_sucursal),
    id_cliente: id_cliente == null ? null : Number(id_cliente),
    totalCentavos,
    detallesCalculados,
  };
};

const crearVenta = async (datos, usuario) => {
  const {
    metodo_pago,
    monto_recibido,
  } = datos;

  if (!METODOS_PERMITIDOS.includes(metodo_pago)) {
    lanzarError('Los pagos con tarjeta deben iniciarse desde el POS de Recurrente', 400);
  }

  validarDatosBasicosVenta(datos, usuario);

  const idVenta = await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const idSesionCaja = await validarSesionCaja(datos, usuario, client);
    const ventaPreparada = await prepararVenta(datos, usuario, client);
    const recibidoCentavos = aCentavos(monto_recibido);
    if (recibidoCentavos < ventaPreparada.totalCentavos) {
      lanzarError(
        `El monto recibido es insuficiente. El total es Q${aMonto(ventaPreparada.totalCentavos)}`,
        400,
      );
    }
    const cambioCentavos = recibidoCentavos - ventaPreparada.totalCentavos;

    const venta = await VentaDAO.crearVenta({
      id_sucursal: ventaPreparada.id_sucursal,
      id_usuario: Number(usuario.id_usuario),
      id_sesion_caja: idSesionCaja,
      id_cliente: ventaPreparada.id_cliente,
      metodo_pago,
      proveedor_pago: null,
      referencia_pago: null,
      estado_pago: null,
      autorizacion_pago: null,
      tarjeta_ultimos4: null,
      total: aMonto(ventaPreparada.totalCentavos),
      monto_recibido: aMonto(recibidoCentavos),
      cambio: aMonto(cambioCentavos),
    }, client);

    for (const detalle of ventaPreparada.detallesCalculados) {
      const loteActualizado = await VentaDAO.descontarStock(
        detalle.id_lote,
        detalle.cantidad,
        client,
      );
      if (!loteActualizado) {
        lanzarError(`Stock insuficiente para el lote ${detalle.id_lote}`, 409);
      }

      await VentaDAO.crearDetalle({
        id_venta: venta.id_venta,
        ...detalle,
      }, client);
    }

    return venta.id_venta;
  });

  return VentaDAO.obtenerPorId(idVenta);
};

const crearPagoPOS = async (datos, usuario) => {
  validarDatosBasicosVenta(datos, usuario);
  const terminalId = process.env.RECURRENTE_TERMINAL_ID;
  if (!terminalId) {
    lanzarError('Configura RECURRENTE_TERMINAL_ID para procesar pagos con POS', 503);
  }

  const externalId = `farmacom-pos-${crypto.randomUUID()}`;
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
      estado: 'fallido',
      estado_pago: 'error_al_iniciar',
    }, client));
    throw error;
  }

  const estadoComando = comando.status === 'dispatched' ? 'procesando' : (
    comando.status === 'failed' ? 'fallido' : 'pendiente'
  );
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
    moneda: 'GTQ',
  };
};

const mapearEstadoWebhook = (estado, eventType) => {
  if (estado === 'succeeded' || eventType?.endsWith('.succeeded')) return 'pagado';
  if (estado === 'failed' || eventType?.endsWith('.failed')) return 'fallido';
  if (estado === 'canceled' || eventType?.endsWith('.canceled')) return 'cancelado';
  return 'pendiente';
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

    if (
      pago.estado === 'pagado'
      || pago.estado === 'fallido'
      || pago.estado === 'cancelado'
      || pago.estado === 'rechazado'
    ) {
      return {
        procesado: true,
        duplicado: pago.estado === 'pagado',
        estado: pago.estado,
        id_venta: pago.id_venta,
      };
    }

    const estadoPago = mapearEstadoWebhook(evento.estado, evento.eventType);
    if (estadoPago !== 'pagado') {
      const actualizado = await VentaDAO.actualizarPagoPOS({
        external_id: evento.externalId,
        estado: estadoPago,
        estado_pago: evento.estado,
        evento_recurrente_id: evento.idEvento,
      }, client);
      return { procesado: true, estado: actualizado.estado };
    }

    if (
      Number(evento.amountInCents) !== aCentavos(pago.total)
      || (evento.currency && evento.currency !== 'GTQ')
      || !evento.referenciaPago
    ) {
      const actualizado = await VentaDAO.actualizarPagoPOS({
        external_id: evento.externalId,
        estado: 'rechazado',
        estado_pago: 'monto_o_moneda_invalida',
        evento_recurrente_id: evento.idEvento,
        referencia_pago: evento.referenciaPago,
      }, client);
      return { procesado: true, estado: actualizado.estado };
    }

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
      const actualizado = await VentaDAO.actualizarPagoPOS({
        external_id: evento.externalId,
        estado: 'rechazado',
        estado_pago: 'inventario_no_disponible',
        evento_recurrente_id: evento.idEvento,
        referencia_pago: evento.referenciaPago,
      }, client);
      return { procesado: true, estado: actualizado.estado };
    }
    if (ventaPreparada.totalCentavos !== aCentavos(pago.total)) {
      const actualizado = await VentaDAO.actualizarPagoPOS({
        external_id: evento.externalId,
        estado: 'rechazado',
        estado_pago: 'total_venta_invalido',
        evento_recurrente_id: evento.idEvento,
        referencia_pago: evento.referenciaPago,
      }, client);
      return { procesado: true, estado: actualizado.estado };
    }

    const venta = await VentaDAO.crearVenta({
      id_sucursal: ventaPreparada.id_sucursal,
      id_usuario: Number(pago.id_usuario),
      id_sesion_caja: Number(pago.id_sesion_caja),
      id_cliente: ventaPreparada.id_cliente,
      metodo_pago: 'tarjeta',
      proveedor_pago: 'recurrente',
      referencia_pago: evento.referenciaPago,
      estado_pago: 'pagado',
      autorizacion_pago: evento.autorizacionPago,
      tarjeta_ultimos4: evento.tarjetaUltimos4,
      total: aMonto(ventaPreparada.totalCentavos),
      monto_recibido: aMonto(ventaPreparada.totalCentavos),
      cambio: '0.00',
    }, client);

    for (const detalle of ventaPreparada.detallesCalculados) {
      const loteActualizado = await VentaDAO.descontarStock(
        detalle.id_lote,
        detalle.cantidad,
        client,
      );
      if (!loteActualizado) {
        lanzarError(`Stock insuficiente para el lote ${detalle.id_lote}`, 409);
      }
      await VentaDAO.crearDetalle({ id_venta: venta.id_venta, ...detalle }, client);
    }

    const actualizado = await VentaDAO.actualizarPagoPOS({
      external_id: evento.externalId,
      estado: 'pagado',
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

const obtenerTodas = async (filtros, usuario) => {
  const filtrosAplicados = { ...filtros };

  if (usuario.rol === 'dependiente') {
    if (
      filtrosAplicados.id_sucursal
      && Number(filtrosAplicados.id_sucursal) !== Number(usuario.id_sucursal)
    ) {
      lanzarError('No tienes permiso para consultar ventas de otra sucursal', 403);
    }
    filtrosAplicados.id_sucursal = Number(usuario.id_sucursal);
  }

  return VentaDAO.obtenerTodas(filtrosAplicados);
};

const obtenerPorId = (id_venta, usuario) =>
  obtenerVentaAutorizada(id_venta, usuario);

const asociarCliente = async (id_venta, id_cliente, usuario) => {
  await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const venta = await VentaDAO.obtenerParaActualizar(id_venta, client);
    if (!venta) lanzarError('Venta no encontrada', 404);
    validarAccesoSucursal(usuario, venta.id_sucursal);

    await verificarCliente(id_cliente, client);
    await VentaDAO.actualizarCliente(id_venta, id_cliente, client);
  });

  return VentaDAO.obtenerPorId(id_venta);
};

const anularVenta = async (id_venta, motivo_anulacion, usuario) => {
  await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const venta = await VentaDAO.obtenerParaActualizar(id_venta, client);
    if (!venta) lanzarError('Venta no encontrada', 404);
    validarAccesoSucursal(usuario, venta.id_sucursal);

    if (venta.estado === 'anulada') {
      lanzarError('La venta ya esta anulada', 409);
    }

    const detalles = await VentaDAO.obtenerDetallesParaAnulacion(id_venta, client);
    for (const detalle of detalles) {
      const lote = await VentaDAO.restaurarStock(
        detalle.id_lote,
        detalle.cantidad,
        client,
      );
      if (!lote) {
        lanzarError(`No se pudo restaurar el stock del lote ${detalle.id_lote}`, 500);
      }
    }

    await VentaDAO.anular(id_venta, motivo_anulacion, client);
  });

  return VentaDAO.obtenerPorId(id_venta);
};

module.exports = {
  crearPagoPOS,
  crearVenta,
  procesarWebhookRecurrente,
  obtenerEstadoPagoPOS,
  obtenerTodas,
  obtenerPorId,
  asociarCliente,
  anularVenta,
};
