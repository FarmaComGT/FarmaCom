import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

export default function useClientes(filtros) {
  const pagina = filtros?.pagina;
  const limite = filtros?.limite;
  const busqueda = filtros?.busqueda ?? '';
  const [paginacion, setPaginacion] = useState(null);
  const [resuelta, setResuelta] = useState(null);
  const clave = JSON.stringify([pagina, limite, busqueda]);
  const solicitud = useRef(0);
  const refrescarActual = useRef(null);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtenerTodos = useCallback(async () => {
    const numero = ++solicitud.current;
    setCargando(true);
    setPaginacion(null);
    setError(null);
    try {
      const { data } = pagina === undefined
        ? await api.get('/clientes')
        : await api.get('/clientes', { params: { pagina, limite, busqueda: busqueda.trim() } });
      if (numero !== solicitud.current) return;
      setClientes(pagina === undefined ? data : data.datos);
      setPaginacion(data.paginacion ?? null);
    } catch (err) {
      if (numero !== solicitud.current) return;
      setClientes([]);
      setError(err.response?.data?.mensaje || 'No se pudieron cargar los clientes.');
    } finally {
      if (numero === solicitud.current) { setCargando(false); setResuelta(clave); }
    }
  }, [pagina, limite, busqueda, clave]);

  useEffect(() => {
    refrescarActual.current = obtenerTodos;
    // Invalida inmediatamente la consulta anterior, incluso durante el debounce.
    solicitud.current += 1;
    const timer = setTimeout(obtenerTodos, pagina === undefined ? 0 : 300);
    return () => { clearTimeout(timer); solicitud.current += 1; };
  }, [obtenerTodos, pagina]);

  const crear = async (payload) => {
    const { data } = await api.post('/clientes', payload);
    if (pagina !== undefined) { await refrescarActual.current(); return data; }
    setClientes((prev) => [...prev, data].sort((a, b) => a.nombre_cliente.localeCompare(b.nombre_cliente)));
    return data;
  };
  const actualizar = async (id, payload) => {
    const { data } = await api.put(`/clientes/${id}`, payload);
    if (pagina !== undefined) { await refrescarActual.current(); return data; }
    setClientes((prev) => prev.map((cliente) => (cliente.id_cliente === id ? data : cliente))
      .sort((a, b) => a.nombre_cliente.localeCompare(b.nombre_cliente)));
    return data;
  };
  const eliminar = async (id) => {
    await api.delete(`/clientes/${id}`);
    if (pagina !== undefined) { await refrescarActual.current(); return; }
    setClientes((prev) => prev.filter((cliente) => cliente.id_cliente !== id));
  };

  return { clientes, paginacion: resuelta === clave ? paginacion : null,
    cargando: cargando || resuelta !== clave, error, crear, actualizar, eliminar, refrescar: obtenerTodos };
}
