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

export default function usePromociones(idProducto, { pagina, limite, id_sucursal } = {}) {
  const clave = JSON.stringify([idProducto, pagina, limite, id_sucursal]);
  const [promociones, setPromociones] = useState([]);
  const [paginacion, setPaginacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resuelta, setResuelta] = useState(null);

  const cargar = useCallback(async (signal) => {
    if (!idProducto) {
      setPromociones([]);
      setPaginacion(null);
      setError(null);
      setCargando(false);
      setResuelta(clave);
      return;
    }

    setCargando(true);
    setPaginacion(null);
    setError(null);
    try {
      const datos = await obtenerPromocionesProducto(idProducto, {
        signal,
        params: pagina === undefined ? undefined : { pagina, limite, id_sucursal },
      });
      setPromociones(Array.isArray(datos) ? datos : datos.datos);
      setPaginacion(datos.paginacion ?? null);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        setPromociones([]);
        setError(obtenerMensaje(err, 'No se pudieron cargar las promociones.'));
      }
    } finally {
      if (!signal?.aborted) {
        setCargando(false);
        setResuelta(clave);
      }
    }
  }, [idProducto, pagina, limite, id_sucursal, clave]);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const crear = async (datos) => {
    const promocion = await crearPromocion(idProducto, datos);
    if (pagina !== undefined) await cargar();
    else setPromociones((actuales) => [promocion, ...actuales]);
    return promocion;
  };

  const actualizar = async (idPromocion, datos) => {
    const promocion = await actualizarPromocion(idPromocion, datos);
    if (pagina !== undefined) await cargar();
    else setPromociones((actuales) => actuales.map((actual) => (
      Number(actual.id_promocion) === Number(idPromocion)
        ? { ...actual, ...promocion }
        : actual
    )));
    return promocion;
  };

  const cambiarEstado = async (idPromocion, activo) => {
    const resultado = await cambiarEstadoPromocion(idPromocion, activo);
    if (pagina !== undefined) await cargar();
    else setPromociones((actuales) => actuales.map((actual) => (
      Number(actual.id_promocion) === Number(idPromocion)
        ? { ...actual, ...resultado.promocion, activo }
        : actual
    )));
    return resultado;
  };

  return {
    promociones,
    paginacion: resuelta === clave ? paginacion : null,
    cargando: cargando || resuelta !== clave,
    error: resuelta === clave ? error : null,
    refrescar: cargar,
    crear,
    actualizar,
    cambiarEstado,
  };
}
