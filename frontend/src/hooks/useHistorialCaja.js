import { obtenerCierres } from '../api/cajas';
import useConsultaListado from './useConsultaListado';

export default function useHistorialCaja(filtros) {
  const { datos, ...estado } = useConsultaListado(obtenerCierres, {
    id_sucursal: filtros?.id_sucursal ?? '',
    id_caja: filtros?.id_caja ?? '',
    fecha_desde: filtros?.fecha_desde ?? '',
    fecha_hasta: filtros?.fecha_hasta ?? '',
    ...(filtros?.pagina !== undefined ? { pagina: filtros.pagina, limite: filtros.limite ?? 25 } : {}),
  }, 'No se pudo cargar el historial de cierres.');
  return { cierres: datos, ...estado };
}
