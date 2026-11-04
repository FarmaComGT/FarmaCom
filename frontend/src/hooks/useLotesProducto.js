import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const useLotesProducto = (idProducto, { enabled = true, refreshKey = 0,
  pagina, limite = 25, id_sucursal, estado_stock = '', estado_vencimiento = '' } = {}) => {
  const [lotes, setLotes] = useState([]);
  const [paginacion, setPaginacion] = useState(null);
  const [resuelta, setResuelta] = useState(null);
  const solicitud = useRef(0);
  const clave = JSON.stringify([idProducto, enabled, refreshKey, pagina, limite, id_sucursal, estado_stock, estado_vencimiento]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargarLotes = useCallback(async () => {
    const numero = ++solicitud.current;
    if (!enabled || !idProducto) return;

    setCargando(true);
    setError(null);
    setPaginacion(null);

    try {
      const params = { pagina, limite };
      Object.entries({ id_sucursal, estado_stock, estado_vencimiento }).forEach(([campo, valor]) => {
        if (valor !== '' && valor != null) params[campo] = valor;
      });
      const { data } = pagina === undefined
        ? await api.get(`/lotes/producto/${idProducto}`)
        : await api.get(`/lotes/producto/${idProducto}`, { params });
      if (numero !== solicitud.current) return;
      setLotes(pagina === undefined ? data : data.datos);
      setPaginacion(data.paginacion ?? null);
    } catch (err) {
      if (numero !== solicitud.current) return;
      setLotes([]);
      setError(err.response?.data?.mensaje || 'Error al cargar lotes del producto');
    } finally {
      if (numero === solicitud.current) { setCargando(false); setResuelta(clave); }
    }
  }, [enabled, idProducto, pagina, limite, id_sucursal, estado_stock, estado_vencimiento, clave]);

  useEffect(() => {
    cargarLotes();
    return () => { solicitud.current += 1; };
  }, [cargarLotes]);

  return {
    lotes: enabled && idProducto ? lotes : [],
    paginacion: resuelta === clave && enabled && idProducto ? paginacion : null,
    cargando: Boolean(enabled && idProducto && (cargando || resuelta !== clave)),
    error: resuelta === clave && enabled && idProducto ? error : null,
    refrescar: cargarLotes,
  };
};

export default useLotesProducto;
