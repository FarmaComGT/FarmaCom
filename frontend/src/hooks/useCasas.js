import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const useCasas = () => {
  const [casas, setCasas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtenerTodas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.get('/casas');
      setCasas(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar casas farmacéuticas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerTodas();
  }, [obtenerTodas]);

  const crear = async (payload) => {
    const { data } = await api.post('/casas', payload);
    setCasas((prev) => [...prev, data]);
    return data;
  };

  const actualizar = async (id, payload) => {
    const { data } = await api.put(`/casas/${id}`, payload);
    setCasas((prev) => prev.map((c) => (c.id_casa === id ? data : c)));
    return data;
  };

  const cambiarEstado = async (id, activo) => {
    const { data } = await api.patch(`/casas/${id}/estado`, { activo });
    setCasas((prev) => prev.map((c) => (c.id_casa === id ? data : c)));
    return data;
  };

  const eliminar = async (id) => {
    const { data = {} } = await api.delete(`/casas/${id}`);
    if (data.accion === 'desactivado') {
      setCasas((prev) => prev.map((casa) => (
        casa.id_casa === id
          ? { ...casa, ...(data.casa || {}), activo: false }
          : casa
      )));
    } else {
      setCasas((prev) => prev.filter((casa) => casa.id_casa !== id));
    }
    return data;
  };

  return { casas, cargando, error, refrescar: obtenerTodas, crear, actualizar, cambiarEstado, eliminar };
};

export default useCasas;
