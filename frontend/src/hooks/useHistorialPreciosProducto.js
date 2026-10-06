import { useCallback, useEffect, useState } from 'react';
import { obtenerHistorialPreciosProducto } from '../api/historiales';

export default function useHistorialPreciosProducto(idProducto, { enabled = true } = {}) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!enabled || !idProducto) return;

    setCargando(true);
    setError(null);
    try {
      setHistorial(await obtenerHistorialPreciosProducto(idProducto));
    } catch (err) {
      setHistorial([]);
      setError(err.response?.data?.mensaje || 'No se pudo cargar el historial de precios.');
    } finally {
      setCargando(false);
    }
  }, [enabled, idProducto]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { historial, cargando, error, recargar: cargar };
}
