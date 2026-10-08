const METODOS_PAGO = Object.freeze({
  EFECTIVO: 'efectivo',
  TARJETA: 'tarjeta',
});

const ESTADOS_PAGO_POS = Object.freeze({
  PENDIENTE: 'pendiente',
  PROCESANDO: 'procesando',
  PAGADO: 'pagado',
  FALLIDO: 'fallido',
  CANCELADO: 'cancelado',
  RECHAZADO: 'rechazado',
});

const ESTADOS_FINALES_PAGO_POS = Object.freeze([
  ESTADOS_PAGO_POS.PAGADO,
  ESTADOS_PAGO_POS.FALLIDO,
  ESTADOS_PAGO_POS.CANCELADO,
  ESTADOS_PAGO_POS.RECHAZADO,
]);

const ESTADOS_RECURRENTE = Object.freeze({
  PENDIENTE: 'pending',
  EXITOSO: 'succeeded',
  FALLIDO: 'failed',
  CANCELADO: 'canceled',
});

const ESTADOS_COMANDO_TERMINAL = Object.freeze({
  ENVIADO: 'dispatched',
  FALLIDO: 'failed',
});

const CODIGOS_ESTADO_PAGO_POS = Object.freeze({
  ERROR_AL_INICIAR: 'error_al_iniciar',
  MONTO_O_MONEDA_INVALIDA: 'monto_o_moneda_invalida',
  INVENTARIO_NO_DISPONIBLE: 'inventario_no_disponible',
  TOTAL_VENTA_INVALIDO: 'total_venta_invalido',
});

const MONEDA_PAGO_POS = 'GTQ';
const PROVEEDOR_PAGO_POS = 'recurrente';
const PREFIJO_EXTERNAL_ID_POS = 'farmacom-pos-';

module.exports = {
  METODOS_PAGO,
  ESTADOS_PAGO_POS,
  ESTADOS_FINALES_PAGO_POS,
  ESTADOS_RECURRENTE,
  ESTADOS_COMANDO_TERMINAL,
  CODIGOS_ESTADO_PAGO_POS,
  MONEDA_PAGO_POS,
  PROVEEDOR_PAGO_POS,
  PREFIJO_EXTERNAL_ID_POS,
};
