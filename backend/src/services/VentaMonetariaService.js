const { lanzarError } = require('./VentaErrores');

const MAXIMO_CENTAVOS = 999999999999;

const aCentavos = (monto) => Math.round(Number(monto) * 100);
const aMonto = (centavos) => (centavos / 100).toFixed(2);

const calcularDetalles = (detallesValidados, promocionesPorProducto = new Map()) => {
  let totalCentavos = 0;
  const saldos = new Map();
  const detallesCalculados = [];

  // Mismo orden en caja y servidor para repartir el último cupo entre lotes.
  [...detallesValidados].sort((a, b) => a.id_lote - b.id_lote).forEach(({ id_lote, cantidad, lote }) => {
    const promocion = promocionesPorProducto.get(Number(lote.id_producto));
    const precioNormalCentavos = aCentavos(lote.precio_venta);
    const precioPromocionalCentavos = promocion
      ? aCentavos(promocion.precio_promocion)
      : precioNormalCentavos;
    const costoCentavos = aCentavos(lote.precio_compra);
    const idPromocion = Number(promocion?.id_promocion);
    if (promocion && !saldos.has(idPromocion)) saldos.set(idPromocion,
      promocion.cantidad_disponible == null ? Infinity : Math.max(0, Number(promocion.cantidad_disponible)));
    const cantidadPromo = promocion && precioPromocionalCentavos < precioNormalCentavos
      ? Math.min(cantidad, saldos.get(idPromocion)) : 0;
    if (cantidadPromo) saldos.set(idPromocion, saldos.get(idPromocion) - cantidadPromo);
    const subtotalCentavos = precioPromocionalCentavos * cantidadPromo + precioNormalCentavos * (cantidad - cantidadPromo);

    if (
      !Number.isSafeInteger(subtotalCentavos)
      || totalCentavos + subtotalCentavos > MAXIMO_CENTAVOS
    ) {
      lanzarError('El total de la venta supera el monto maximo permitido', 400);
    }

    totalCentavos += subtotalCentavos;

    if (cantidadPromo) detallesCalculados.push({ id_lote, cantidad: cantidadPromo,
      precio_unitario: aMonto(precioPromocionalCentavos), costo_unitario: aMonto(costoCentavos),
      id_promocion: promocion.id_promocion });
    if (cantidad > cantidadPromo) detallesCalculados.push({ id_lote, cantidad: cantidad - cantidadPromo,
      precio_unitario: aMonto(precioNormalCentavos), costo_unitario: aMonto(costoCentavos) });
  });

  if (totalCentavos <= 0) {
    lanzarError('El total de la venta debe ser mayor a cero', 400);
  }

  const orden = new Map(detallesValidados.map((detalle, indice) => [detalle.id_lote, indice]));
  detallesCalculados.sort((a, b) => orden.get(a.id_lote) - orden.get(b.id_lote));
  return { totalCentavos, detallesCalculados };
};

const calcularCobroEfectivo = (monto_recibido, totalCentavos) => {
  const recibidoCentavos = aCentavos(monto_recibido);

  if (recibidoCentavos < totalCentavos) {
    lanzarError(
      `El monto recibido es insuficiente. El total es Q${aMonto(totalCentavos)}`,
      400,
    );
  }

  return {
    recibidoCentavos,
    cambioCentavos: recibidoCentavos - totalCentavos,
  };
};

module.exports = {
  aCentavos,
  aMonto,
  calcularDetalles,
  calcularCobroEfectivo,
};
