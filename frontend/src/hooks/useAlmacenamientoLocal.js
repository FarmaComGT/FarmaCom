import { useCallback, useEffect, useState } from 'react';
import {
  soportaAlmacenamientoLocal,
  obtenerCarpetaRaiz,
  guardarCarpetaRaiz,
  verificarPermiso,
  solicitarPermiso,
  elegirCarpetaRaiz,
  crearCarpetaPaciente,
  guardarPdfLocal,
  registrarRespaldo,
  listarRespaldosPorPaciente,
  obtenerArchivoLocal,
  nombreArchivoResultado,
} from '../utils/almacenamientoLocal';

const useAlmacenamientoLocal = () => {
  const [cargando, setCargando] = useState(true);
  const [raizHandle, setRaizHandle] = useState(null);
  const [permisoOk, setPermisoOk] = useState(false);

  const verificarEstado = useCallback(async () => {
    if (!soportaAlmacenamientoLocal()) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const handle = await obtenerCarpetaRaiz();
      setRaizHandle(handle);
      if (handle) {
        const permiso = await verificarPermiso(handle);
        setPermisoOk(permiso === 'granted');
      } else {
        setPermisoOk(false);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    verificarEstado();
  }, [verificarEstado]);

  // Requiere gesto de usuario (click): se usa para la configuración inicial.
  const elegirCarpeta = useCallback(async () => {
    const handle = await elegirCarpetaRaiz();
    setRaizHandle(handle);
    setPermisoOk(true);
    return handle;
  }, []);

  // Requiere gesto de usuario: vuelve a pedir permiso tras reabrir el navegador.
  const reconectar = useCallback(async () => {
    if (!raizHandle) return false;
    const permiso = await solicitarPermiso(raizHandle);
    const ok = permiso === 'granted';
    setPermisoOk(ok);
    return ok;
  }, [raizHandle]);

  const crearCarpetaDePaciente = useCallback(async (idPaciente, nombrePaciente) => {
    if (!raizHandle || !permisoOk) return;
    try {
      await crearCarpetaPaciente(raizHandle, idPaciente, nombrePaciente);
    } catch (error) {
      // No bloquea el flujo de creación del paciente por un problema local.
      console.error('No se pudo crear la carpeta local del paciente:', error);
    }
  }, [raizHandle, permisoOk]);

  const guardarRespaldo = useCallback(async (paciente, resultado, bytes) => {
    if (!raizHandle || !permisoOk) return false;
    const carpetaPaciente = await crearCarpetaPaciente(
      raizHandle,
      paciente.id_paciente,
      paciente.nombre_paciente,
    );
    const nombreArchivo = nombreArchivoResultado(resultado);
    await guardarPdfLocal(carpetaPaciente, nombreArchivo, bytes);
    await registrarRespaldo({
      id_resultado: resultado.id_resultado,
      id_paciente: paciente.id_paciente,
      nombre_paciente: paciente.nombre_paciente,
      categoria: resultado.categoria,
      fecha_subida: resultado.fecha_subida,
      token_publico: resultado.token_publico,
      nombre_archivo: nombreArchivo,
    });
    return true;
  }, [raizHandle, permisoOk]);

  const respaldosDe = useCallback((idPaciente) => listarRespaldosPorPaciente(idPaciente), []);

  const abrirArchivoLocal = useCallback(async (respaldo) => {
    if (!raizHandle) return;
    const archivo = await obtenerArchivoLocal(
      raizHandle,
      respaldo.id_paciente,
      respaldo.nombre_paciente,
      respaldo.nombre_archivo,
    );
    const url = URL.createObjectURL(archivo);
    window.open(url, '_blank', 'noopener');
  }, [raizHandle]);

  return {
    soportado: soportaAlmacenamientoLocal(),
    cargando,
    carpetaConfigurada: Boolean(raizHandle),
    permisoOk,
    elegirCarpeta,
    reconectar,
    crearCarpetaDePaciente,
    guardarRespaldo,
    respaldosDe,
    abrirArchivoLocal,
  };
};

export default useAlmacenamientoLocal;
