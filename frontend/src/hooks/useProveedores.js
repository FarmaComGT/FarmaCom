import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const useProveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtenerTodos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.get('/proveedores');
      setProveedores(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar proveedores');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { obtenerTodos(); }, [obtenerTodos]);

  const crear = async (payload) => {
    const { data } = await api.post('/proveedores', payload);
    setProveedores((prev) => [...prev, data]);
    return data;
  };

  const actualizar = async (id, payload) => {
    const { data } = await api.put(`/proveedores/${id}`, payload);
    setProveedores((prev) => prev.map((p) => (p.id_proveedor === id ? data : p)));
    return data;
  };

  const cambiarEstado = async (id, activo) => {
    const { data } = await api.patch(`/proveedores/${id}/estado`, { activo });
    setProveedores((prev) => prev.map((p) => (p.id_proveedor === id ? data : p)));
    return data;
  };

  const eliminar = async (id) => {
    const { data = {} } = await api.delete(`/proveedores/${id}`);
    if (data.accion === 'desactivado') {
      setProveedores((prev) => prev.map((proveedor) => (
        proveedor.id_proveedor === id
          ? { ...proveedor, ...(data.proveedor || {}), activo: false }
          : proveedor
      )));
    } else {
      setProveedores((prev) => prev.filter((proveedor) => proveedor.id_proveedor !== id));
    }
    return data;
  };

  return { proveedores, cargando, error, refrescar: obtenerTodos, crear, actualizar, cambiarEstado, eliminar };
};

export default useProveedores;
