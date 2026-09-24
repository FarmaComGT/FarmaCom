import { useCallback, useEffect, useState } from 'react';
import {
  obtenerRentabilidad,
  obtenerMetodosPago,
  obtenerResumenVentas,
  obtenerSerieVentas,
  obtenerTopProductos,
} from '../api/reportes';

const RECURSOS = [
  {
    clave: 'rentabilidad',
    cargar: obtenerRentabilidad,
    valorInicial: [],
    mensajeError: 'No se pudo cargar la rentabilidad por sucursal.',
  },
  {
    clave: 'resumen',
    cargar: obtenerResumenVentas,
    valorInicial: null,
    mensajeError: 'No se pudo cargar el resumen de ventas.',
  },
  {
    clave: 'serie',
    cargar: obtenerSerieVentas,
    valorInicial: [],
    mensajeError: 'No se pudo cargar la evolución de ventas.',
  },
  {
    clave: 'metodosPago',
    cargar: obtenerMetodosPago,
    valorInicial: [],
    mensajeError: 'No se pudo cargar la distribución de métodos de pago.',
  },
  {
    clave: 'topProductos',
    cargar: obtenerTopProductos,
    valorInicial: [],
    mensajeError: 'No se pudieron cargar los productos destacados.',
  },
];

const obtenerMensajeError = (error, mensajePredeterminado) => (
  error?.response?.data?.mensaje
  || error?.response?.data?.errores?.[0]?.msg
  || error?.message
  || mensajePredeterminado
);

function useRecursoReporte(recurso, filtros, versionRecarga) {
  const { cargar, valorInicial, mensajeError, clave } = recurso;
  const [estado, setEstado] = useState(() => ({
    datos: valorInicial, cargando: true, error: null,
  }));

  const idSucursal = filtros?.id_sucursal ?? '';
  const fechaDesde = filtros?.fecha_desde ?? '';
  const fechaHasta = filtros?.fecha_hasta ?? '';
  const agrupacion = clave === 'serie' ? filtros?.agrupacion ?? 'dia' : undefined;
  const criterio = clave === 'topProductos' ? filtros?.criterio ?? 'cantidad' : undefined;
  const limite = clave === 'topProductos' ? filtros?.limite ?? 5 : undefined;

  useEffect(() => {
    const controller = new AbortController();
    const filtrosSolicitud = {
      id_sucursal: idSucursal,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      ...(agrupacion !== undefined ? { agrupacion } : {}),
      ...(criterio !== undefined ? { criterio, limite } : {}),
    };

    setEstado((actual) => ({ ...actual, cargando: true, error: null }));

    const cargarRecurso = async () => {
      try {
        const datos = await cargar(filtrosSolicitud, { signal: controller.signal });

        if (controller.signal.aborted) return;

        setEstado({ datos, cargando: false, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;

        setEstado({
          datos: valorInicial,
          cargando: false,
          error: obtenerMensajeError(error, mensajeError),
        });
      }
    };

    cargarRecurso();

    return () => controller.abort();
  }, [
    agrupacion,
    criterio,
    fechaDesde,
    fechaHasta,
    idSucursal,
    limite,
    versionRecarga,
    cargar,
    valorInicial,
    mensajeError,
  ]);

  return estado;
}

export default function useReportes(filtros) {
  const [versionRecarga, setVersionRecarga] = useState(0);
  const recargar = useCallback(() => {
    setVersionRecarga((version) => version + 1);
  }, []);

  const resumen = useRecursoReporte(RECURSOS[1], filtros, versionRecarga);
  const serie = useRecursoReporte(RECURSOS[2], filtros, versionRecarga);
  const metodosPago = useRecursoReporte(RECURSOS[3], filtros, versionRecarga);
  const topProductos = useRecursoReporte(RECURSOS[4], filtros, versionRecarga);
  const estado = { resumen, serie, metodosPago, topProductos };

  return {
    ...estado,
    cargando: Object.values(estado).some((recurso) => recurso.cargando),
    recargar,
  };
}

export function useRentabilidad(filtros) {
  const [versionRecarga, setVersionRecarga] = useState(0);
  const recargar = useCallback(() => setVersionRecarga((version) => version + 1), []);
  const estado = useRecursoReporte(RECURSOS[0], filtros, versionRecarga);
  return { ...estado, recargar };
}
