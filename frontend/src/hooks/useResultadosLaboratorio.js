import { useState, useEffect, useCallback } from 'react';
import { listarResultados, subirResultado, anularResultado } from '../api/resultadosLaboratorio';

const useResultadosLaboratorio = (idPaciente) => {
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtener = useCallback(async () => {
    if (!idPaciente) return;
    setCargando(true);
    setError(null);
    try {
      const data = await listarResultados(idPaciente);
      setResultados(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar los resultados');
    } finally {
      setCargando(false);
    }
  }, [idPaciente]);

  const subir = async ({ categoria, archivo }) => {
    try {
      const resultado = await subirResultado({ idPaciente, categoria, archivo });
      await obtener();
      return resultado;
    } catch (err) {
      throw new Error(err.response?.data?.mensaje || 'Error al subir el resultado');
    }
  };

  const anular = async (id, motivo) => {
    try {
      const resultado = await anularResultado(id, motivo);
      await obtener();
      return resultado;
    } catch (err) {
      throw new Error(err.response?.data?.mensaje || 'Error al anular el resultado');
    }
  };

  useEffect(() => {
    obtener();
  }, [obtener]);

  return { resultados, cargando, error, subir, anular, refrescar: obtener };
};

export default useResultadosLaboratorio;
