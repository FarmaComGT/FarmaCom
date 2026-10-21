const VentaDAO = require('../daos/VentaDAO');
const CajaDAO = require('../daos/CajaDAO');
const { lanzarError } = require('./VentaErrores');
const {
  ROLES_ACCESO_GLOBAL,
  obtenerIdUsuario,
  validarPertenenciaSesionCaja,
} = require('../utils/accesoCaja');
const {
  aMonto,
  calcularCobroEfectivo,
} = require('./VentaMonetariaService');
const {
  validarAccesoSucursal,
  validarDatosBasicosVenta,
  validarSesionCaja,
  verificarCliente,
  prepararVenta,
} = require('./VentaPreparacionService');
const {
  registrarDetallesYDescontarStock,
  restaurarExistenciasDeDetalles,
} = require('./VentaDetalleService');
const {
  crearPagoPOS,
  procesarWebhookRecurrente,
  obtenerEstadoPagoPOS,
} = require('./VentaPagoPOSService');
const { METODOS_PAGO } = require('./VentaPagoConstantes');

const METODOS_PERMITIDOS = [METODOS_PAGO.EFECTIVO];

const obtenerVentaAutorizada = async (id_venta, usuario) => {
  const venta = await VentaDAO.obtenerPorId(id_venta);
  if (!venta) lanzarError('Venta no encontrada', 404);
  validarAccesoSucursal(usuario, venta.id_sucursal);
  return venta;
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
    const { recibidoCentavos, cambioCentavos } = calcularCobroEfectivo(
      monto_recibido,
      ventaPreparada.totalCentavos,
    );

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

    await registrarDetallesYDescontarStock(
      venta.id_venta,
      ventaPreparada.detallesCalculados,
      client,
    );

    return venta.id_venta;
  });

  return VentaDAO.obtenerPorId(idVenta);
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

const normalizarMotivoAnulacion = (motivo) => {
  if (typeof motivo !== 'string' || !motivo.trim()) {
    lanzarError('El motivo de anulación es requerido', 400);
  }

  const motivoNormalizado = motivo.trim();
  if (motivoNormalizado.length > 500) {
    lanzarError('El motivo de anulación no puede superar los 500 caracteres', 400);
  }
  return motivoNormalizado;
};

const validarResponsableVenta = (venta, usuario) => {
  const idUsuario = obtenerIdUsuario(usuario);
  if (ROLES_ACCESO_GLOBAL.has(usuario.rol)) return;

  if (usuario.rol !== 'dependiente') {
    lanzarError('No tienes permiso para anular ventas', 403);
  }
  if (Number(venta.id_usuario) !== idUsuario) {
    lanzarError('Solo el responsable de la venta puede anularla', 403);
  }
};

const anularVenta = async (id_venta, motivo_anulacion, usuario) => {
  const motivo = normalizarMotivoAnulacion(motivo_anulacion);

  await VentaDAO.ejecutarEnTransaccion(async (client) => {
    const venta = await VentaDAO.obtenerParaActualizar(id_venta, client);
    if (!venta) lanzarError('Venta no encontrada', 404);
    validarAccesoSucursal(usuario, venta.id_sucursal);
    validarResponsableVenta(venta, usuario);

    if (venta.estado === 'anulada') {
      lanzarError('La venta ya está anulada', 409);
    }
    if (venta.estado !== 'completada') {
      lanzarError('La venta no se encuentra completada', 409);
    }
    if (venta.metodo_pago === METODOS_PAGO.TARJETA) {
      lanzarError(
        'Las ventas pagadas con tarjeta requieren un reembolso en Recurrente',
        409,
      );
    }
    if (venta.metodo_pago !== METODOS_PAGO.EFECTIVO) {
      lanzarError('El método de pago de la venta no permite anulación', 409);
    }
    if (!venta.id_sesion_caja) {
      lanzarError('La venta no está asociada a una sesión de caja', 409);
    }

    const sesion = await CajaDAO.obtenerSesionPorId(
      venta.id_sesion_caja,
      client,
      'share',
    );
    if (!sesion) lanzarError('Sesión de caja no encontrada', 404);
    if (Number(sesion.id_sucursal) !== Number(venta.id_sucursal)) {
      lanzarError('La sesión de caja no pertenece a la sucursal de la venta', 409);
    }
    validarPertenenciaSesionCaja(usuario, sesion);
    if (sesion.estado !== 'abierta') {
      lanzarError('No se puede anular una venta con la sesión de caja cerrada', 409);
    }

    const ventaAnulada = await VentaDAO.anular(id_venta, motivo, client);
    if (!ventaAnulada) {
      lanzarError('La venta ya fue anulada por otra solicitud', 409);
    }
    const detalles = await VentaDAO.obtenerDetallesParaAnulacion(id_venta, client);
    await restaurarExistenciasDeDetalles(detalles, client);
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
