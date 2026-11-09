import { useCallback, useEffect, useRef, useState } from 'react';
import {
  actualizarPromocion,
  cambiarEstadoPromocion,
  crearPromocion,
  obtenerPromocionesProducto,
  obtenerPromociones,
} from '../api/promociones';

const obtenerMensaje = (error, predeterminado) => (
  error.response?.data?.mensaje || error.message || predeterminado
);

export default function usePromociones(idProducto, { pagina, limite, id_sucursal, global = false, busqueda, estado } = {}) {
  const clave = JSON.stringify([idProducto, pagina, limite, id_sucursal, global, busqueda, estado]);
  const [promociones, setPromociones] = useState([]);
  const [paginacion, setPaginacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resuelta, setResuelta] = useState(null);
  const solicitud = useRef(0);

  const cargar = useCallback(async (signal) => {
    const actual = ++solicitud.current;
    if (!global && !idProducto) {
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
      const datos = global ? await obtenerPromociones({ signal, params: { pagina, limite, id_sucursal, id_producto: idProducto || undefined, busqueda, estado } }) : await obtenerPromocionesProducto(idProducto, {
        signal,
        params: pagina === undefined ? undefined : { pagina, limite, id_sucursal },
      });
      if (signal?.aborted || actual !== solicitud.current) return;
      setPromociones(Array.isArray(datos) ? datos : datos.datos);
      setPaginacion(datos.paginacion ?? null);
    } catch (err) {
      if (!signal?.aborted && actual === solicitud.current && err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        setPromociones([]);
        setError(obtenerMensaje(err, 'No se pudieron cargar las promociones.'));
      }
    } finally {
      if (!signal?.aborted && actual === solicitud.current) {
        setCargando(false);
        setResuelta(clave);
      }
    }
  }, [idProducto, pagina, limite, id_sucursal, global, busqueda, estado, clave]);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const crear = async (datos) => {
    const { id_producto: seleccionado, ...campos } = datos;
    const promocion = await crearPromocion(seleccionado || idProducto, campos);
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
    refrescar: () => cargar(),
    crear,
    actualizar,
    cambiarEstado,
  };
}
