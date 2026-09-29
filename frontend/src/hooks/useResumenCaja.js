import { useEffect, useState } from 'react';
import { obtenerResumenDiario } from '../api/cajas';

const obtenerMensajeError = (error) => (
  error?.response?.data?.mensaje
  || error?.response?.data?.errores?.[0]?.msg
  || error?.message
  || 'No se pudo cargar el resumen diario.'
);

export default function useResumenCaja(fecha, idSucursal = '', idCaja = '') {
  const [resumen, setResumen] = useState([]);
  const [cargando, setCargando] = useState(Boolean(fecha && idSucursal));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fecha || !idSucursal) {
      setResumen([]);
      setCargando(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const resultado = await obtenerResumenDiario(
          { fecha, id_sucursal: idSucursal, id_caja: idCaja },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setResumen(resultado);
      } catch (errorSolicitud) {
        if (!controller.signal.aborted) {
          setResumen([]);
          setError(obtenerMensajeError(errorSolicitud));
        }
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    };

    cargar();
    return () => controller.abort();
  }, [fecha, idCaja, idSucursal]);

  return { resumen, cargando, error };
}
