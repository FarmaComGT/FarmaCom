import { useCallback, useEffect, useState } from 'react';
import { obtenerVentas } from '../api/ventas';
import { obtenerResumenProductos } from '../api/reportes';

const useConsulta = (cargar, filtros, mensajePredeterminado) => {
  const [estado, setEstado] = useState({ datos: [], cargando: true, error: null });
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);
  const idSucursal = filtros?.id_sucursal ?? '';
  const fechaDesde = filtros?.fecha_desde ?? '';
  const fechaHasta = filtros?.fecha_hasta ?? '';

  useEffect(() => {
    const controller = new AbortController();
    setEstado((actual) => ({ ...actual, cargando: true, error: null }));

    cargar({
      id_sucursal: idSucursal,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    }, { signal: controller.signal })
      .then((datos) => {
        if (!controller.signal.aborted) setEstado({ datos, cargando: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setEstado({
            datos: [],
            cargando: false,
            error: error?.message || mensajePredeterminado,
          });
        }
      });

    return () => controller.abort();
  }, [cargar, fechaDesde, fechaHasta, idSucursal, mensajePredeterminado, version]);

  return { ...estado, recargar };
};

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
