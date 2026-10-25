import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { agruparLotesPorProductoPOS } from '../utils/pos';

const normalizarProducto = (producto) => {
  const precioMinimo = producto.precio_minimo === null
    ? null
    : Number(producto.precio_minimo);
  const precioMaximo = producto.precio_maximo === null
    ? null
    : Number(producto.precio_maximo);
  const relevancia = Number(producto.relevancia);
  const promocion = producto.id_promocion ? {
    id_promocion: Number(producto.id_promocion),
    cantidad_minima: Number(producto.promocion_cantidad_minima),
    precio_promocion: Number(producto.precio_promocion),
    fecha_inicio: producto.promocion_fecha_inicio,
    fecha_fin: producto.promocion_fecha_fin,
  } : null;

  return {
    ...producto,
    id_producto: Number(producto.id_producto),
    stock_disponible: Number(producto.stock_disponible),
    precio_minimo: precioMinimo,
    precio_maximo: precioMaximo,
    tiene_precio: Number.isFinite(precioMinimo) && precioMinimo > 0,
    promocion,
    relevancia: Number.isFinite(relevancia) ? relevancia : 0,
    tipo_coincidencia: producto.tipo_coincidencia === 'aproximada'
      ? 'aproximada'
      : 'exacta',
  };
};

export default function useAutocompletadoPOS(busqueda, limite = 10) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const solicitudActual = useRef(0);

  const buscar = useCallback(async (termino) => {
    const terminoNormalizado = termino.trim();
    const idSolicitud = solicitudActual.current + 1;
    solicitudActual.current = idSolicitud;

    if (!terminoNormalizado) {
      setProductos([]);
      setError(null);
      setCargando(false);
      return [];
    }

    setCargando(true);
    setError(null);

    try {
      const respuesta = await api.get('/productos/autocompletar', {
        params: { busqueda: terminoNormalizado, limite },
      });
      // El backend ya aplica prioridad directa y Damerau-Levenshtein a las aproximadas.
      const resultados = agruparLotesPorProductoPOS(respuesta.data).map(normalizarProducto);

      if (idSolicitud === solicitudActual.current) {
        setProductos(resultados);
      }
      return resultados;
    } catch (err) {
      if (idSolicitud === solicitudActual.current) {
        setProductos([]);
        setError(
          err.response?.data?.mensaje
          || 'No se pudieron buscar productos. Intenta de nuevo.',
        );
      }
      return [];
    } finally {
      if (idSolicitud === solicitudActual.current) {
        setCargando(false);
      }
    }
  }, [limite]);

  useEffect(() => {
    const termino = busqueda.trim();
    if (!termino) {
      solicitudActual.current += 1;
      setProductos([]);
      setError(null);
      setCargando(false);
      return undefined;
    }

    const temporizador = window.setTimeout(() => buscar(termino), 300);
    return () => window.clearTimeout(temporizador);
  }, [busqueda, buscar]);

  const refrescar = useCallback(() => buscar(busqueda), [buscar, busqueda]);

  return {
    productos,
    cargando,
    error,
    buscarAhora: buscar,
    refrescar,
  };
}
