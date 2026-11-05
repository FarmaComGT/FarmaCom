import { useCallback, useEffect, useRef, useState } from 'react';
import { actualizarLaboratorio, crearLaboratorio, listarLaboratorios } from '../api/laboratorios';

const ordenar = (datos) => [...datos].sort((a, b) => (
  a.nombre_laboratorio.localeCompare(b.nombre_laboratorio, 'es', { sensitivity: 'base' })
));

const useLaboratorios = ({ omitir = false, pagina, limite, busqueda = '' } = {}) => {
  const paginado = pagina !== undefined;
  const clave = JSON.stringify([omitir, pagina, limite, busqueda]);
  const solicitud = useRef(0);
  const [estado, setEstado] = useState({ datos: [], paginacion: null, cargando: !omitir, error: null, clave: null });

  const obtenerTodos = useCallback(async () => {
    if (omitir) return;
    const numero = ++solicitud.current;
    setEstado((actual) => ({ ...actual, cargando: true, paginacion: null, error: null }));
    try {
      const data = await listarLaboratorios(paginado ? { pagina, limite, busqueda } : undefined);
      if (numero !== solicitud.current) return;
      setEstado({ datos: ordenar(Array.isArray(data) ? data : data.datos),
        paginacion: data.paginacion ?? null, cargando: false, error: null, clave });
    } catch (error) {
      if (numero !== solicitud.current) return;
      setEstado({ datos: [], paginacion: null, cargando: false, clave,
        error: error.response?.data?.mensaje || 'Error al cargar laboratorios' });
    }
  }, [omitir, paginado, pagina, limite, busqueda, clave]);

  useEffect(() => {
    if (omitir) {
      setEstado({ datos: [], paginacion: null, cargando: false, error: null, clave });
      return undefined;
    }
    solicitud.current += 1;
    const temporizador = setTimeout(obtenerTodos, paginado && busqueda ? 300 : 0);
    return () => { clearTimeout(temporizador); solicitud.current += 1; };
  }, [obtenerTodos, omitir, paginado, busqueda, clave]);

  const crear = async (datos) => {
    try {
      const laboratorio = await crearLaboratorio(datos);
      if (paginado) await obtenerTodos();
      else setEstado((actual) => ({ ...actual, datos: ordenar([...actual.datos, laboratorio]) }));
      return laboratorio;
    } catch (error) { throw new Error(error.response?.data?.mensaje || 'Error al crear laboratorio'); }
  };

  const actualizar = async (id, datos) => {
    try {
      const laboratorio = await actualizarLaboratorio(id, datos);
      if (paginado) await obtenerTodos();
      else setEstado((actual) => ({ ...actual, datos: ordenar(actual.datos.map((item) => (
        item.id_laboratorio === id ? laboratorio : item
      ))) }));
      return laboratorio;
    } catch (error) { throw new Error(error.response?.data?.mensaje || 'Error al actualizar laboratorio'); }
  };

  return { laboratorios: estado.datos,
    paginacion: estado.clave === clave ? estado.paginacion : null,
    cargando: estado.cargando || (!omitir && estado.clave !== clave),
    error: estado.clave === clave ? estado.error : null,
    crear, actualizar, refrescar: obtenerTodos };
};

export default useLaboratorios;
