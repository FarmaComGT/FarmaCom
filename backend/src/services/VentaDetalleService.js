const VentaDAO = require('../daos/VentaDAO');
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

    await VentaDAO.crearDetalle({ id_venta, ...detalle }, client);
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
};

module.exports = {
  registrarDetallesYDescontarStock,
  restaurarExistenciasDeDetalles,
};
