const VentaDAO = require('../daos/VentaDAO');
const PromocionDAO = require('../daos/PromocionDAO');
const MovimientoInventarioDAO = require('../daos/MovimientoInventarioDAO');
const { lanzarError } = require('./VentaErrores');

const registrarDetallesYDescontarStock = async (
  id_venta,
  detalles,
  contextoOrClient,
  clientArg,
) => {
  const contexto = clientArg ? contextoOrClient : {};
  const client = clientArg || contextoOrClient;
  const { id_usuario, id_sucursal } = contexto;
  for (const detalle of detalles) {
    const loteActualizado = await VentaDAO.descontarStock(
      detalle.id_lote,
      detalle.cantidad,
      client,
    );
    if (!loteActualizado) {
      lanzarError(`Stock insuficiente para el lote ${detalle.id_lote}`, 409);
    }

    const { id_promocion, ...datosDetalle } = detalle;
    await VentaDAO.crearDetalle({ id_venta, ...datosDetalle }, client);
    await MovimientoInventarioDAO.registrar({
      id_lote: detalle.id_lote,
      tipo: 'venta',
      cantidad_anterior: Number(loteActualizado.stock_actual) + Number(detalle.cantidad),
      cantidad_nueva: Number(loteActualizado.stock_actual),
      id_usuario: Number(id_usuario),
      id_sucursal: Number(id_sucursal),
      motivo: 'Salida por venta',
      referencia: `venta:${id_venta}`,
    }, client);
  }
  if (contexto.id_pago_pos) await PromocionDAO.liberarUso({ id_pago_pos: contexto.id_pago_pos }, client);
  await PromocionDAO.registrarUso(detalles, { id_venta }, client);
};

const reservarDetallesPagoPOS = async (id_pago_pos, detalles, client) => {
  for (const detalle of detalles) {
    const reserva = await VentaDAO.reservarStockPagoPOS(id_pago_pos, detalle, client);
    if (!reserva) {
      lanzarError(`Stock insuficiente para el lote ${detalle.id_lote}`, 409);
    }
  }
};

const liberarReservasPagoPOS = async (id_pago_pos, client) => {
  const reservas = await VentaDAO.obtenerReservasActivasPagoPOS(id_pago_pos, client);
  for (const reserva of reservas) {
    const liberada = await VentaDAO.liberarReservaPagoPOS(reserva, client);
    if (!liberada) {
      lanzarError(`No se pudo liberar la reserva del lote ${reserva.id_lote}`, 500);
    }
  }
};

const registrarDetallesYConsumirReservas = async (
  id_venta,
  pago,
  contexto,
  client,
) => {
  const reservas = await VentaDAO.obtenerReservasActivasPagoPOS(pago.id_pago_pos, client);
  const reservasPorLote = new Map(
    reservas.map((reserva) => [Number(reserva.id_lote), reserva]),
  );
  if (reservas.length !== pago.detalles.length) {
    lanzarError('Las reservas del pago no coinciden con el carrito cobrado', 409);
  }

  for (const detalle of pago.detalles) {
    const reserva = reservasPorLote.get(Number(detalle.id_lote));
    if (!reserva || Number(reserva.cantidad) !== Number(detalle.cantidad)) {
      lanzarError(`La reserva del lote ${detalle.id_lote} no coincide con el cobro`, 409);
    }
    const lote = await VentaDAO.consumirReservaPagoPOS(reserva, client);
    if (!lote) {
      lanzarError(`No se pudo consumir la reserva del lote ${detalle.id_lote}`, 409);
    }
    const { id_promocion, ...datosDetalle } = detalle;
    await VentaDAO.crearDetalle({ id_venta, ...datosDetalle }, client);
    await MovimientoInventarioDAO.registrar({
      id_lote: detalle.id_lote,
      tipo: 'venta',
      cantidad_anterior: Number(lote.stock_actual) + Number(detalle.cantidad),
      cantidad_nueva: Number(lote.stock_actual),
      id_usuario: Number(contexto.id_usuario),
      id_sucursal: Number(contexto.id_sucursal),
      motivo: 'Salida por venta',
      referencia: `venta:${id_venta}`,
    }, client);
  }
  if (contexto.id_pago_pos) {
    await PromocionDAO.liberarUso({ id_pago_pos: contexto.id_pago_pos }, client);
  }
  await PromocionDAO.registrarUso(pago.detalles, { id_venta }, client);
};

const restaurarExistenciasDeDetalles = async (
  detalles,
  contextoOrClient,
  clientArg,
) => {
  const contexto = clientArg ? contextoOrClient : {};
  const client = clientArg || contextoOrClient;
  const { id_venta, id_usuario, id_sucursal, motivo } = contexto;
  for (const detalle of detalles) {
    const lote = await VentaDAO.restaurarStock(
      detalle.id_lote,
      detalle.cantidad,
      client,
    );
    if (!lote) {
      lanzarError(`No se pudo restaurar el stock del lote ${detalle.id_lote}`, 500);
    }
    await MovimientoInventarioDAO.registrar({
      id_lote: detalle.id_lote,
      tipo: 'anulacion',
      cantidad_anterior: Number(lote.stock_actual) - Number(detalle.cantidad),
      cantidad_nueva: Number(lote.stock_actual),
      id_usuario: Number(id_usuario),
      id_sucursal: Number(id_sucursal),
      motivo,
      referencia: `venta:${id_venta}`,
    }, client);
  }
  if (id_venta) await PromocionDAO.liberarUso({ id_venta }, client);
};

module.exports = {
  registrarDetallesYDescontarStock,
  reservarDetallesPagoPOS,
  liberarReservasPagoPOS,
  registrarDetallesYConsumirReservas,
  restaurarExistenciasDeDetalles,
};
