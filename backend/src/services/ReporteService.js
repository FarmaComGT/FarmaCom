const ReporteDAO = require('../daos/ReporteDAO');

const CRITERIOS_TOP_PRODUCTOS = ['cantidad', 'ingresos'];
const AGRUPACIONES_SERIE_VENTAS = ['dia', 'semana', 'mes'];

const lanzarError = (mensaje, status = 400) => {
  const error = new Error(mensaje);
  error.status = status;
  throw error;
};

const normalizarFiltrosComunes = (filtros = {}) => {
  const filtrosAplicados = { ...filtros };

  if (filtrosAplicados.id_sucursal) {
    filtrosAplicados.id_sucursal = Number(filtrosAplicados.id_sucursal);
  }

  return filtrosAplicados;
};

const obtenerResumenVentas = async (filtros = {}) => {
  const filtrosAplicados = normalizarFiltrosComunes(filtros);
  return ReporteDAO.obtenerResumenVentas(filtrosAplicados);
};

const obtenerSerieVentas = async (filtros = {}) => {
  const filtrosAplicados = normalizarFiltrosComunes(filtros);

  if (!filtrosAplicados.fecha_desde || !filtrosAplicados.fecha_hasta) {
    lanzarError('fecha_desde y fecha_hasta son requeridas');
  }

  if (!AGRUPACIONES_SERIE_VENTAS.includes(filtrosAplicados.agrupacion)) {
    lanzarError('La agrupación debe ser dia, semana o mes');
  }

  return ReporteDAO.obtenerSerieVentas(filtrosAplicados);
};

const obtenerMetodosPago = async (filtros = {}) => {
  const filtrosAplicados = normalizarFiltrosComunes(filtros);
  return ReporteDAO.obtenerMetodosPago(filtrosAplicados);
};

const obtenerTopProductos = async (filtros = {}) => {
  const filtrosAplicados = normalizarFiltrosComunes({
    ...filtros,
    limite: filtros.limite === undefined ? 5 : Number(filtros.limite),
    criterio: filtros.criterio || 'cantidad',
  });

  if (!CRITERIOS_TOP_PRODUCTOS.includes(filtrosAplicados.criterio)) {
    lanzarError('El criterio debe ser cantidad o ingresos');
  }

  return ReporteDAO.obtenerTopProductos(filtrosAplicados);
};

const obtenerRentabilidad = async (filtros = {}) => {
  const filtrosAplicados = normalizarFiltrosComunes(filtros);
  return ReporteDAO.obtenerRentabilidad(filtrosAplicados);
};

module.exports = {
  obtenerResumenVentas,
  obtenerSerieVentas,
  obtenerMetodosPago,
  obtenerTopProductos,
  obtenerRentabilidad,
};
