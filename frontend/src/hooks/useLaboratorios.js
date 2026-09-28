import { useState, useEffect, useCallback } from 'react';
import {
  actualizarLaboratorio,
  crearLaboratorio,
  listarLaboratorios,
} from '../api/laboratorios';

const ordenarLaboratorios = (laboratorios) => [...laboratorios].sort((a, b) => (
  a.nombre_laboratorio.localeCompare(b.nombre_laboratorio, 'es', { sensitivity: 'base' })
));

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
      setLaboratorios(ordenarLaboratorios(data));
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar laboratorios');
    } finally {
      setCargando(false);
    }
  }, [omitir]);

  useEffect(() => {
    obtenerTodos();
  }, [obtenerTodos]);

  const crear = async (datos) => {
    try {
      const laboratorio = await crearLaboratorio(datos);
      setLaboratorios((actuales) => ordenarLaboratorios([...actuales, laboratorio]));
      return laboratorio;
    } catch (err) {
      throw new Error(err.response?.data?.mensaje || 'Error al crear laboratorio');
    }
  };

  const actualizar = async (id, datos) => {
    try {
      const laboratorio = await actualizarLaboratorio(id, datos);
      setLaboratorios((actuales) => ordenarLaboratorios(actuales.map((item) => (
        item.id_laboratorio === id ? laboratorio : item
      ))));
      return laboratorio;
    } catch (err) {
      throw new Error(err.response?.data?.mensaje || 'Error al actualizar laboratorio');
    }
  };

  return {
    laboratorios,
    cargando,
    error,
    crear,
    actualizar,
    refrescar: obtenerTodos,
  };
};

export default useLaboratorios;
