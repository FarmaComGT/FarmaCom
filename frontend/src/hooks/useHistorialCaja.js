import { useCallback, useEffect, useState } from 'react';
import { obtenerCierres } from '../api/cajas';

const obtenerMensajeError = (error) => (
  error?.response?.data?.mensaje
  || error?.response?.data?.errores?.[0]?.msg
  || error?.message
  || 'No se pudo cargar el historial de cierres.'
);

export default function useHistorialCaja(filtros) {
  const [cierres, setCierres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => {
    setVersion((actual) => actual + 1);
  }, []);

  const idSucursal = filtros?.id_sucursal ?? '';
  const idCaja = filtros?.id_caja ?? '';
  const fechaDesde = filtros?.fecha_desde ?? '';
  const fechaHasta = filtros?.fecha_hasta ?? '';

  useEffect(() => {
    const controller = new AbortController();

    const cargar = async () => {
      setCargando(true);
      setError(null);

      try {
        const resultado = await obtenerCierres({
          id_sucursal: idSucursal,
          id_caja: idCaja,
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
        }, { signal: controller.signal });

        if (!controller.signal.aborted) {
          setCierres(resultado);
        }
      } catch (errorSolicitud) {
        if (!controller.signal.aborted) {
          setCierres([]);
          setError(obtenerMensajeError(errorSolicitud));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargar();
    return () => controller.abort();
  }, [fechaDesde, fechaHasta, idCaja, idSucursal, version]);

  return { cierres, cargando, error, recargar };
}
