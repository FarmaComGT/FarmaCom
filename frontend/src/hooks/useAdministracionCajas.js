import { useCallback, useEffect, useState } from 'react';
import { actualizarCaja, crearCaja, obtenerCajas } from '../api/cajas';

const mensajeError = (error, predeterminado) => (
  error?.response?.data?.mensaje || error?.message || predeterminado
);

export default function useAdministracionCajas() {
  const [cajas, setCajas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (signal) => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await obtenerCajas({}, { signal });
      if (!signal?.aborted) setCajas(resultado);
    } catch (errorSolicitud) {
      if (!signal?.aborted) {
        setError(mensajeError(errorSolicitud, 'No se pudieron cargar las cajas.'));
      }
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const crear = async (datos) => {
    const nueva = await crearCaja(datos).catch((errorSolicitud) => {
      throw new Error(mensajeError(errorSolicitud, 'No se pudo crear la caja.'));
    });
    await cargar();
    return nueva;
  };

  const actualizar = async (idCaja, datos) => {
    const actualizada = await actualizarCaja(idCaja, datos).catch((errorSolicitud) => {
      throw new Error(mensajeError(errorSolicitud, 'No se pudo actualizar la caja.'));
    });
    setCajas((actuales) => actuales.map((caja) => (
      caja.id_caja === idCaja ? { ...caja, ...actualizada } : caja
    )));
    return actualizada;
  };

  return { cajas, cargando, error, crear, actualizar };
}
