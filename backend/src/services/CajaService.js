const CajaDAO = require('../daos/CajaDAO');
const SucursalDAO = require('../daos/SucursalDAO');

const lanzarError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

const aCentavos = (monto) => Math.round(Number(monto) * 100);
const aMonto = (centavos) => (centavos / 100).toFixed(2);

const validarAccesoSucursal = (usuario, id_sucursal) => {
  if (
    usuario.rol === 'dependiente'
    && Number(usuario.id_sucursal) !== Number(id_sucursal)
  ) {
    lanzarError('No tienes permiso para operar cajas de otra sucursal', 403);
  }
};

const agregarTotalVentas = (registro) => ({
  ...registro,
  total_ventas: aMonto(
    aCentavos(registro.total_ventas_efectivo || 0)
      + aCentavos(registro.total_ventas_tarjeta || 0),
  ),
});

const crearCaja = async ({ id_sucursal, nombre }) => {
  const sucursal = await SucursalDAO.obtenerPorId(id_sucursal);
  if (!sucursal) lanzarError('Sucursal no encontrada', 404);

  const existente = await CajaDAO.obtenerCajaPorNombre(id_sucursal, nombre);
  if (existente) {
    lanzarError('Ya existe una caja con ese nombre en la sucursal', 409);
  }

  try {
    return await CajaDAO.crearCaja({ id_sucursal, nombre });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'uq_caja_sucursal_nombre') {
      lanzarError('Ya existe una caja con ese nombre en la sucursal', 409);
    }
    throw error;
  }
};

const obtenerCajas = async (filtros, usuario) => {
  const filtrosAplicados = { ...filtros };
  if (usuario.rol === 'dependiente') {
    if (
      filtrosAplicados.id_sucursal
      && Number(filtrosAplicados.id_sucursal) !== Number(usuario.id_sucursal)
    ) {
      lanzarError('No tienes permiso para consultar cajas de otra sucursal', 403);
    }
    filtrosAplicados.id_sucursal = Number(usuario.id_sucursal);
  }
  return CajaDAO.obtenerCajas(filtrosAplicados);
};

const actualizarCaja = async (id_caja, campos, usuario) => {
  const caja = await CajaDAO.obtenerCajaPorId(id_caja);
  if (!caja) lanzarError('Caja no encontrada', 404);
  validarAccesoSucursal(usuario, caja.id_sucursal);

  if (campos.nombre && campos.nombre.toLowerCase() !== caja.nombre.toLowerCase()) {
    const duplicada = await CajaDAO.obtenerCajaPorNombre(caja.id_sucursal, campos.nombre);
    if (duplicada) {
      lanzarError('Ya existe una caja con ese nombre en la sucursal', 409);
    }
  }

  if (campos.activa === false) {
    const sesionAbierta = await CajaDAO.obtenerSesionAbiertaPorCaja(id_caja);
    if (sesionAbierta) {
      lanzarError('No se puede desactivar una caja con una sesión abierta', 409);
    }
  }

  try {
    return await CajaDAO.actualizarCaja(id_caja, campos);
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'uq_caja_sucursal_nombre') {
      lanzarError('Ya existe una caja con ese nombre en la sucursal', 409);
    }
    throw error;
  }
};

const abrirSesion = async (id_caja, { turno, fondo_inicial }, usuario) => {
  try {
    return await CajaDAO.ejecutarEnTransaccion(async (client) => {
      const caja = await CajaDAO.obtenerCajaPorId(id_caja, client, true);
      if (!caja) lanzarError('Caja no encontrada', 404);
      validarAccesoSucursal(usuario, caja.id_sucursal);
      if (!caja.activa) lanzarError('La caja está inactiva', 409);

      const abierta = await CajaDAO.obtenerSesionAbiertaPorCaja(id_caja, client);
      if (abierta) lanzarError('La caja ya tiene una sesión abierta', 409);

      return CajaDAO.crearSesion({
        id_caja,
        id_usuario_apertura: Number(usuario.id_usuario),
        turno,
        fondo_inicial: aMonto(aCentavos(fondo_inicial)),
      }, client);
    });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'uq_sesion_caja_abierta') {
      lanzarError('La caja ya tiene una sesión abierta', 409);
    }
    throw error;
  }
};

const obtenerSesionActual = async (id_caja, usuario) => {
  const caja = await CajaDAO.obtenerCajaPorId(id_caja);
  if (!caja) lanzarError('Caja no encontrada', 404);
  validarAccesoSucursal(usuario, caja.id_sucursal);

  const sesion = await CajaDAO.obtenerSesionAbiertaPorCaja(id_caja);
  if (!sesion) lanzarError('La caja no tiene una sesión abierta', 404);
  return sesion;
};

const registrarMovimiento = async (
  id_sesion_caja,
  { tipo, monto, motivo },
  usuario,
) => CajaDAO.ejecutarEnTransaccion(async (client) => {
  const sesion = await CajaDAO.obtenerSesionPorId(id_sesion_caja, client, 'update');
  if (!sesion) lanzarError('Sesión de caja no encontrada', 404);
  validarAccesoSucursal(usuario, sesion.id_sucursal);
  if (sesion.estado !== 'abierta') {
    lanzarError('No se pueden registrar movimientos en una sesión cerrada', 409);
  }

  const montoCentavos = aCentavos(monto);
  if (tipo === 'salida') {
    const totales = await CajaDAO.obtenerTotalesSesion(id_sesion_caja, client);
    const disponible = aCentavos(sesion.fondo_inicial)
      + aCentavos(totales.ventas_efectivo)
      + aCentavos(totales.total_entradas)
      - aCentavos(totales.total_salidas);
    if (montoCentavos > disponible) {
      lanzarError('La salida supera el efectivo esperado disponible en caja', 409);
    }
  }

  return CajaDAO.crearMovimiento({
    id_sesion_caja,
    id_usuario: Number(usuario.id_usuario),
    tipo,
    monto: aMonto(montoCentavos),
    motivo,
  }, client);
});

const cerrarSesion = async (
  id_sesion_caja,
  { efectivo_contado, observaciones },
  usuario,
) => CajaDAO.ejecutarEnTransaccion(async (client) => {
  const sesion = await CajaDAO.obtenerSesionPorId(id_sesion_caja, client, 'update');
  if (!sesion) lanzarError('Sesión de caja no encontrada', 404);
  validarAccesoSucursal(usuario, sesion.id_sucursal);
  if (sesion.estado !== 'abierta') {
    lanzarError('La sesión de caja ya está cerrada', 409);
  }

  const pagosPendientes = await CajaDAO.contarPagosPOSPendientes(
    id_sesion_caja,
    client,
  );
  if (pagosPendientes > 0) {
    lanzarError('No se puede cerrar la caja mientras haya pagos POS pendientes', 409);
  }

  const totales = await CajaDAO.obtenerTotalesSesion(id_sesion_caja, client);
  const efectivoEsperadoCentavos = aCentavos(sesion.fondo_inicial)
    + aCentavos(totales.ventas_efectivo)
    + aCentavos(totales.total_entradas)
    - aCentavos(totales.total_salidas);
  const efectivoContadoCentavos = aCentavos(efectivo_contado);
  const diferenciaCentavos = efectivoContadoCentavos - efectivoEsperadoCentavos;

  if (diferenciaCentavos !== 0 && !observaciones) {
    lanzarError('Las diferencias de efectivo requieren una observación', 400);
  }

  await CajaDAO.cerrarSesion(id_sesion_caja, {
    id_usuario_cierre: Number(usuario.id_usuario),
    total_ventas_efectivo: aMonto(aCentavos(totales.ventas_efectivo)),
    total_ventas_tarjeta: aMonto(aCentavos(totales.ventas_tarjeta)),
    total_entradas: aMonto(aCentavos(totales.total_entradas)),
    total_salidas: aMonto(aCentavos(totales.total_salidas)),
    efectivo_esperado: aMonto(efectivoEsperadoCentavos),
    efectivo_contado: aMonto(efectivoContadoCentavos),
    diferencia_efectivo: aMonto(diferenciaCentavos),
    cantidad_ventas: Number(totales.cantidad_ventas),
    cantidad_anulaciones: Number(totales.cantidad_anulaciones),
    observaciones: observaciones || null,
  }, client);

  const cierre = await CajaDAO.obtenerSesionPorId(id_sesion_caja, client);
  const resultado = diferenciaCentavos === 0
    ? 'cuadrada'
    : diferenciaCentavos > 0
      ? 'sobrante'
      : 'faltante';

  return {
    ...agregarTotalVentas(cierre),
    resultado,
  };
});

const obtenerCierres = async (filtros) => {
  const cierres = await CajaDAO.obtenerCierres(filtros);
  return cierres.map(agregarTotalVentas);
};

const obtenerResumenDiario = async (fecha, id_sucursal) => {
  const resumen = await CajaDAO.obtenerResumenDiario(fecha, id_sucursal);
  return resumen.map(agregarTotalVentas);
};

module.exports = {
  crearCaja,
  obtenerCajas,
  actualizarCaja,
  abrirSesion,
  obtenerSesionActual,
  registrarMovimiento,
  cerrarSesion,
  obtenerCierres,
  obtenerResumenDiario,
};
