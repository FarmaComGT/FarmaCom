const VentaDAO = require('../daos/VentaDAO');
const { lanzarError } = require('./VentaErrores');

const registrarDetallesYDescontarStock = async (id_venta, detalles, client) => {
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
  }
};

const restaurarExistenciasDeDetalles = async (detalles, client) => {
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
};

module.exports = {
  registrarDetallesYDescontarStock,
  restaurarExistenciasDeDetalles,
};
