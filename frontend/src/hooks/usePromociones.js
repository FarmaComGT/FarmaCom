import { useCallback, useEffect, useState } from 'react';
import {
  actualizarPromocion,
  cambiarEstadoPromocion,
  crearPromocion,
  obtenerPromocionesProducto,
} from '../api/promociones';

const obtenerMensaje = (error, predeterminado) => (
  error.response?.data?.mensaje || error.message || predeterminado
);

export default function usePromociones(idProducto) {
  const [promociones, setPromociones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (signal) => {
    if (!idProducto) {
      setPromociones([]);
      setError(null);
      return;
    }

    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerPromocionesProducto(idProducto, { signal });
      setPromociones(datos);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        setPromociones([]);
        setError(obtenerMensaje(err, 'No se pudieron cargar las promociones.'));
      }
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, [idProducto]);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const crear = async (datos) => {
    const promocion = await crearPromocion(idProducto, datos);
    setPromociones((actuales) => [promocion, ...actuales]);
    return promocion;
  };

  const actualizar = async (idPromocion, datos) => {
    const promocion = await actualizarPromocion(idPromocion, datos);
    setPromociones((actuales) => actuales.map((actual) => (
      Number(actual.id_promocion) === Number(idPromocion)
        ? { ...actual, ...promocion }
        : actual
    )));
    return promocion;
  };

  const cambiarEstado = async (idPromocion, activo) => {
    const resultado = await cambiarEstadoPromocion(idPromocion, activo);
    setPromociones((actuales) => actuales.map((actual) => (
      Number(actual.id_promocion) === Number(idPromocion)
        ? { ...actual, ...resultado.promocion, activo }
        : actual
    )));
    return resultado;
  };

  return {
    promociones,
    cargando,
    error,
    refrescar: cargar,
    crear,
    actualizar,
    cambiarEstado,
  };
}
