import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

export default function useListadoPaginado(ruta, filtros, mensajeError, habilitado = true) {
  const paginado = filtros?.pagina !== undefined;
  const clave = JSON.stringify(filtros ?? null);
  const solicitud = useRef(0);
  const [estado, setEstado] = useState({
    datos: [], paginacion: null, cargando: true, error: null, clave: null,
  });

  const cargar = useCallback(async () => {
    if (!habilitado) return;
    const numero = ++solicitud.current;
    setEstado((actual) => ({ ...actual, paginacion: null, cargando: true, error: null }));
    try {
      const { data } = paginado
        ? await api.get(ruta, { params: filtros })
        : await api.get(ruta);
      if (numero !== solicitud.current) return;
      setEstado({
        datos: Array.isArray(data) ? data : data.datos,
        paginacion: data.paginacion ?? null,
        cargando: false,
        error: null,
        clave,
      });
    } catch (error) {
      if (numero !== solicitud.current) return;
      setEstado({
        datos: [], paginacion: null, cargando: false, clave,
        error: error.response?.data?.mensaje || mensajeError,
      });
    }
  }, [ruta, clave, paginado, mensajeError, habilitado]);

  useEffect(() => {
    if (!habilitado) {
      setEstado({ datos: [], paginacion: null, cargando: false, error: null, clave });
      return undefined;
    }
    solicitud.current += 1;
    const temporizador = setTimeout(cargar, paginado && filtros?.busqueda ? 300 : 0);
    return () => {
      clearTimeout(temporizador);
      solicitud.current += 1;
    };
  }, [cargar, paginado, filtros?.busqueda, habilitado, clave]);

  const actualizarDatos = useCallback((actualizador) => {
    setEstado((actual) => ({
      ...actual,
      datos: typeof actualizador === 'function' ? actualizador(actual.datos) : actualizador,
    }));
  }, []);

  return {
    datos: estado.datos,
    paginacion: estado.clave === clave ? estado.paginacion : null,
    cargando: estado.cargando || estado.clave !== clave,
    error: estado.clave === clave ? estado.error : null,
    cargar,
    actualizarDatos,
    paginado,
  };
}
