const ClienteDAO = require('../daos/ClienteDAO');
const HistorialCompraDAO = require('../daos/HistorialCompraDAO');
const AppError = require('../errors/AppError');

const lanzarError = (mensaje, status) => {
  throw new AppError(mensaje, status);
};

const validarRangoFechas = ({ fecha_desde, fecha_hasta }) => {
  if (fecha_desde && fecha_hasta && new Date(fecha_desde) > new Date(fecha_hasta)) {
    lanzarError('fecha_desde no puede ser posterior a fecha_hasta', 400);
  }
};

const construirResumen = (compras) => {
  const comprasCompletadas = compras.filter((compra) => compra.estado !== 'anulada');
  const montoTotal = comprasCompletadas.reduce(
    (total, compra) => total + Number(compra.total || 0),
    0,
  );
  const totalArticulos = comprasCompletadas.reduce(
    (total, compra) => total + Number(compra.cantidad_articulos || 0),
    0,
  );

  return {
    total_compras: comprasCompletadas.length,
    total_articulos: totalArticulos,
    monto_total: montoTotal.toFixed(2),
  };
};

const obtenerPorCliente = async (id_cliente, filtros = {}) => {
  const cliente = await ClienteDAO.obtenerPorId(id_cliente);
  if (!cliente) lanzarError('Cliente no encontrado', 404);

  validarRangoFechas(filtros);

  const filtrosAplicados = {
    id_cliente,
    id_sucursal: filtros.id_sucursal,
    estado: filtros.estado,
    fecha_desde: filtros.fecha_desde,
    fecha_hasta: filtros.fecha_hasta,
  };

  const compras = await HistorialCompraDAO.obtenerPorCliente(filtrosAplicados);

  return {
    cliente,
    resumen: construirResumen(compras),
    compras,
  };
};

module.exports = { obtenerPorCliente };
