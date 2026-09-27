import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const normalizarProducto = (producto) => {
  const precioVenta = Number(producto.precio_venta);
  const relevancia = Number(producto.relevancia);

  return {
    ...producto,
    id_producto: Number(producto.id_producto),
    id_lote: Number(producto.id_lote),
    carritoKey: `lote-${producto.id_lote}`,
    stock_disponible: Number(producto.stock_disponible),
    precio_venta: precioVenta,
    tiene_precio: Number.isFinite(precioVenta) && precioVenta > 0,
    relevancia: Number.isFinite(relevancia) ? relevancia : 0,
    tipo_coincidencia: producto.tipo_coincidencia === 'aproximada'
      ? 'aproximada'
      : 'exacta',
  };
};

const ordenarResultados = (productos) => [...productos].sort((primero, segundo) => {
  const primeroEsAproximado = primero.tipo_coincidencia === 'aproximada';
  const segundoEsAproximado = segundo.tipo_coincidencia === 'aproximada';

  if (primeroEsAproximado !== segundoEsAproximado) {
    return primeroEsAproximado ? 1 : -1;
  }

  if (primeroEsAproximado) {
    return segundo.relevancia - primero.relevancia;
  }

  // El backend ya ordena las coincidencias directas por código y prefijo.
  return 0;
});

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
      const resultados = ordenarResultados(respuesta.data.map(normalizarProducto));

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
