import { useState, useEffect, useCallback } from 'react';
import { listarLaboratorios } from '../api/laboratorios';

const useLaboratorios = ({ omitir = false } = {}) => {
  const [laboratorios, setLaboratorios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtenerTodos = useCallback(async () => {
    if (omitir) return;
    setCargando(true);
    setError(null);
    try {
      const data = await listarLaboratorios();
      setLaboratorios(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar laboratorios');
    } finally {
      setCargando(false);
    }
  }, [omitir]);

  useEffect(() => {
    obtenerTodos();
  }, [obtenerTodos]);

  return { laboratorios, cargando, error, refrescar: obtenerTodos };
};

export default useLaboratorios;
