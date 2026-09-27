import { useState, useEffect, useCallback } from 'react';
import {
  buscarPacientes,
  crearPaciente,
  actualizarPaciente,
  anularPaciente,
} from '../api/pacientes';

const PAGINACION_INICIAL = { pagina: 1, limite: 20, total: 0, total_paginas: 1 };
const RESUMEN_INICIAL = { activos: 0, anulados: 0 };

const usePacientes = ({ idLaboratorio, busqueda = '', estado, pagina = 1, limite = 20 }) => {
  const [pacientes, setPacientes] = useState([]);
  const [paginacion, setPaginacion] = useState(PAGINACION_INICIAL);
  const [resumenEstados, setResumenEstados] = useState(RESUMEN_INICIAL);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const obtener = useCallback(async () => {
    if (!idLaboratorio) return;
    setCargando(true);
    setError(null);
    try {
      const { datos, paginacion: paginacionRespuesta } = await buscarPacientes({
        id_laboratorio: idLaboratorio,
        busqueda: busqueda || undefined,
        estado: estado || undefined,
        pagina,
        limite,
      });
      setPacientes(datos);
      setPaginacion(paginacionRespuesta);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar pacientes');
    } finally {
      setCargando(false);
    }
  }, [idLaboratorio, busqueda, estado, pagina, limite]);

  const obtenerResumenEstados = useCallback(async () => {
    if (!idLaboratorio) return;
    try {
      const [activos, anulados] = await Promise.all([
        buscarPacientes({ id_laboratorio: idLaboratorio, busqueda: busqueda || undefined, estado: 'activo', pagina: 1, limite: 1 }),
        buscarPacientes({ id_laboratorio: idLaboratorio, busqueda: busqueda || undefined, estado: 'anulado', pagina: 1, limite: 1 }),
      ]);
      setResumenEstados({
        activos: activos.paginacion.total,
        anulados: anulados.paginacion.total,
      });
    } catch {
      // El resumen es informativo: si falla, se deja el último valor conocido.
    }
  }, [idLaboratorio, busqueda]);

  const crear = async (datos) => {
    try {
      const paciente = await crearPaciente({ ...datos, id_laboratorio: idLaboratorio });
      await Promise.all([obtener(), obtenerResumenEstados()]);
      return paciente;
    } catch (err) {
      throw new Error(err.response?.data?.mensaje || 'Error al crear paciente');
    }
  };

  const actualizar = async (id, datos) => {
    try {
      const paciente = await actualizarPaciente(id, datos);
      await obtener();
      return paciente;
    } catch (err) {
      throw new Error(err.response?.data?.mensaje || 'Error al actualizar paciente');
    }
  };

  const anular = async (id, motivo) => {
    try {
      const paciente = await anularPaciente(id, motivo);
      await Promise.all([obtener(), obtenerResumenEstados()]);
      return paciente;
    } catch (err) {
      throw new Error(err.response?.data?.mensaje || 'Error al anular paciente');
    }
  };

  useEffect(() => {
    obtener();
  }, [obtener]);

  useEffect(() => {
    obtenerResumenEstados();
  }, [obtenerResumenEstados]);

  return {
    pacientes,
    paginacion,
    resumenEstados,
    cargando,
    error,
    crear,
    actualizar,
    anular,
    refrescar: obtener,
  };
};

export default usePacientes;
