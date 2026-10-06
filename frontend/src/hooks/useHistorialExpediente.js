import { useCallback, useEffect, useState } from 'react';
import { obtenerHistorialExpediente } from '../api/historiales';

export default function useHistorialExpediente(idExpediente, { enabled = true } = {}) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!enabled || !idExpediente) return;

    setCargando(true);
    setError(null);
    try {
      setHistorial(await obtenerHistorialExpediente(idExpediente));
    } catch (err) {
      setHistorial([]);
      setError(err.response?.data?.mensaje || 'No se pudo cargar el historial del expediente.');
    } finally {
      setCargando(false);
    }
  }, [enabled, idExpediente]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { historial, cargando, error, recargar: cargar };
}
