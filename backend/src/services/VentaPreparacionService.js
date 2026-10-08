const VentaDAO = require('../daos/VentaDAO');
const CajaDAO = require('../daos/CajaDAO');
const { lanzarError } = require('./VentaErrores');
const { calcularDetalles } = require('./VentaMonetariaService');

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

const validarDatosBasicosVenta = (datos, usuario) => {
  const { id_sucursal, detalles } = datos;

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
  const { id_sucursal, id_cliente = null, detalles } = datos;
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
  const detallesValidados = detalles.map(({ id_lote, cantidad }) => {
    const idLote = Number(id_lote);
    const cantidadSolicitada = Number(cantidad);
    const lote = lotesPorId.get(idLote);

    if (Number(lote.id_sucursal) !== Number(id_sucursal)) {
      lanzarError(`El lote ${id_lote} no pertenece a la sucursal indicada`, 409);
    }
    if (!lote.producto_activo) {
      lanzarError(`El producto del lote ${id_lote} esta inactivo`, 409);
    }
    if (lote.vencido) {
      lanzarError(`No se puede vender el lote ${id_lote} porque esta vencido`, 409);
    }
    if (Number(lote.stock_actual) < cantidadSolicitada) {
      lanzarError(`Stock insuficiente para el lote ${id_lote}`, 409);
    }

    return { id_lote: idLote, cantidad: cantidadSolicitada, lote };
  });

  const { totalCentavos, detallesCalculados } = calcularDetalles(detallesValidados);

  return {
    id_sucursal: Number(id_sucursal),
    id_cliente: id_cliente == null ? null : Number(id_cliente),
    totalCentavos,
    detallesCalculados,
  };
};

module.exports = {
  puedeAccederSucursal,
  validarAccesoSucursal,
  verificarCliente,
  validarDatosBasicosVenta,
  validarSesionCaja,
  prepararVenta,
};
