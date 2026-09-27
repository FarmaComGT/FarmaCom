const { lanzarError } = require('./VentaErrores');

const MAXIMO_CENTAVOS = 999999999999;

const aCentavos = (monto) => Math.round(Number(monto) * 100);
const aMonto = (centavos) => (centavos / 100).toFixed(2);

const calcularDetalles = (detallesValidados) => {
  let totalCentavos = 0;

  const detallesCalculados = detallesValidados.map(({ id_lote, cantidad, lote }) => {
    const precioCentavos = aCentavos(lote.precio_venta);
    const costoCentavos = aCentavos(lote.precio_compra);
    const subtotalCentavos = precioCentavos * cantidad;

    if (
      !Number.isSafeInteger(subtotalCentavos)
      || totalCentavos + subtotalCentavos > MAXIMO_CENTAVOS
    ) {
      lanzarError('El total de la venta supera el monto maximo permitido', 400);
    }

    totalCentavos += subtotalCentavos;

    return {
      id_lote,
      cantidad,
      precio_unitario: aMonto(precioCentavos),
      costo_unitario: aMonto(costoCentavos),
    };
  });

  if (totalCentavos <= 0) {
    lanzarError('El total de la venta debe ser mayor a cero', 400);
  }

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
