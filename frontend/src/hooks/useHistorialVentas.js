import useConsultaListado from './useConsultaListado';
import { obtenerVentas } from '../api/ventas';
import { obtenerResumenProductos } from '../api/reportes';

const useConsulta = (cargar, filtros, mensaje) => useConsultaListado(cargar, {
  id_sucursal: filtros?.id_sucursal ?? '',
  fecha_desde: filtros?.fecha_desde ?? '',
  fecha_hasta: filtros?.fecha_hasta ?? '',
  ...(filtros?.pagina !== undefined ? { pagina: filtros.pagina, limite: filtros.limite ?? 25 } : {}),
}, mensaje);

export const useVentas = (filtros) => useConsulta(
  obtenerVentas,
  filtros,
  'No se pudo cargar el historial de ventas.',
);

export const useResumenProductos = (filtros) => useConsulta(
  obtenerResumenProductos,
  filtros,
  'No se pudo cargar el resumen por producto.',
);
