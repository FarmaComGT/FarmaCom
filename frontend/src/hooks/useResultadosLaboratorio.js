import { useCallback, useEffect, useRef, useState } from 'react';
import { listarResultados, subirResultado, anularResultado } from '../api/resultadosLaboratorio';

const useResultadosLaboratorio = (idPaciente, { pagina, limite } = {}) => {
  const clave = JSON.stringify([idPaciente, pagina, limite]);
  const solicitud = useRef(0);
  const [resultados, setResultados] = useState([]);
  const [paginacion, setPaginacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resuelta, setResuelta] = useState(null);

  const obtener = useCallback(async () => {
    if (!idPaciente) return;
    const numero = ++solicitud.current;
    setCargando(true);
    setPaginacion(null);
    setError(null);
    try {
      const data = await listarResultados(
        idPaciente,
        pagina === undefined ? {} : { pagina, limite },
      );
      if (numero !== solicitud.current) return;
      setResultados(Array.isArray(data) ? data : data.datos);
      setPaginacion(data.paginacion ?? null);
    } catch (err) {
      if (numero !== solicitud.current) return;
      setResultados([]);
      setError(err.response?.data?.mensaje || 'Error al cargar los resultados');
    } finally {
      if (numero === solicitud.current) {
        setCargando(false);
        setResuelta(clave);
      }
    }
  }, [idPaciente, pagina, limite, clave]);

  const subir = async ({ categoria, archivo }) => {
    try {
      const resultado = await subirResultado({ idPaciente, categoria, archivo });
      await obtener();
      return resultado;
    } catch (err) { throw new Error(err.response?.data?.mensaje || 'Error al subir el resultado'); }
  };

  const anular = async (id, motivo) => {
    try {
      const resultado = await anularResultado(id, motivo);
      await obtener();
      return resultado;
    } catch (err) { throw new Error(err.response?.data?.mensaje || 'Error al anular el resultado'); }
  };

  useEffect(() => {
    obtener();
    return () => { solicitud.current += 1; };
  }, [obtener]);

  return {
    resultados,
    paginacion: resuelta === clave ? paginacion : null,
    cargando: Boolean(idPaciente) && (cargando || resuelta !== clave),
    error: resuelta === clave ? error : null,
    subir,
    anular,
    refrescar: obtener,
  };
};

export default useResultadosLaboratorio;
