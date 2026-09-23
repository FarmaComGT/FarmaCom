import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  abrirSesion,
  cerrarSesion,
  obtenerCajas,
  obtenerSesionActual,
  registrarMovimiento,
} from '../api/cajas';

const obtenerMensajeError = (error, mensajePredeterminado) => (
  error?.response?.data?.mensaje
  || error?.response?.data?.errores?.[0]?.msg
  || error?.message
  || mensajePredeterminado
);

export default function useCaja(idSucursal) {
  const [cajas, setCajas] = useState([]);
  const [idCajaSeleccionada, setIdCajaSeleccionada] = useState(null);
  const [sesionActual, setSesionActual] = useState(null);
  const [cargandoCajas, setCargandoCajas] = useState(true);
  const [cargandoSesion, setCargandoSesion] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [versionCajas, setVersionCajas] = useState(0);

  const cajaSeleccionada = useMemo(() => cajas.find(
    (caja) => String(caja.id_caja) === String(idCajaSeleccionada),
  ) || null, [cajas, idCajaSeleccionada]);

  const limpiarError = useCallback(() => setError(null), []);

  const refrescarCajas = useCallback(() => {
    setVersionCajas((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const cargarCajas = async () => {
      setCargandoCajas(true);
      setError(null);

      try {
        const resultado = await obtenerCajas(
          { id_sucursal: idSucursal, activa: true },
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setCajas(resultado);
        }
      } catch (errorSolicitud) {
        if (!controller.signal.aborted) {
          setCajas([]);
          setError(obtenerMensajeError(
            errorSolicitud,
            'No se pudieron cargar las cajas.',
          ));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoCajas(false);
        }
      }
    };

    cargarCajas();

    return () => controller.abort();
  }, [idSucursal, versionCajas]);

  useEffect(() => {
    if (!idCajaSeleccionada) {
      setSesionActual(null);
      setCargandoSesion(false);
      return undefined;
    }

    const controller = new AbortController();

    const cargarSesion = async () => {
      setCargandoSesion(true);
      setError(null);

      try {
        const sesion = await obtenerSesionActual(idCajaSeleccionada, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setSesionActual(sesion);
        }
      } catch (errorSolicitud) {
        if (controller.signal.aborted) return;

        setSesionActual(null);
        if (errorSolicitud?.response?.status !== 404) {
          setError(obtenerMensajeError(
            errorSolicitud,
            'No se pudo consultar la sesión actual.',
          ));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoSesion(false);
        }
      }
    };

    cargarSesion();

    return () => controller.abort();
  }, [idCajaSeleccionada]);

  const seleccionarCaja = useCallback((idCaja) => {
    setIdCajaSeleccionada(idCaja || null);
    setSesionActual(null);
  }, []);

  const ejecutarOperacion = useCallback(async (operacion, mensajePredeterminado) => {
    setProcesando(true);
    setError(null);

    try {
      return await operacion();
    } catch (errorSolicitud) {
      const mensaje = obtenerMensajeError(errorSolicitud, mensajePredeterminado);
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setProcesando(false);
    }
  }, []);

  const abrir = useCallback((datos) => ejecutarOperacion(async () => {
    if (!idCajaSeleccionada) {
      throw new Error('Selecciona una caja antes de abrir el turno.');
    }

    const sesion = await abrirSesion(idCajaSeleccionada, datos);
    setSesionActual(sesion);
    setCajas((actuales) => actuales.map((caja) => (
      String(caja.id_caja) === String(idCajaSeleccionada)
        ? {
          ...caja,
          id_sesion_abierta: sesion.id_sesion_caja,
          turno: sesion.turno,
          fecha_hora_apertura: sesion.fecha_hora_apertura,
        }
        : caja
    )));
    return sesion;
  }, 'No se pudo abrir la sesión de caja.'), [ejecutarOperacion, idCajaSeleccionada]);

  const registrar = useCallback((datos) => ejecutarOperacion(async () => {
    if (!sesionActual?.id_sesion_caja) {
      throw new Error('No hay una sesión de caja abierta.');
    }

    return registrarMovimiento(sesionActual.id_sesion_caja, datos);
  }, 'No se pudo registrar el movimiento.'), [ejecutarOperacion, sesionActual]);

  const cerrar = useCallback((datos) => ejecutarOperacion(async () => {
    if (!sesionActual?.id_sesion_caja) {
      throw new Error('No hay una sesión de caja abierta.');
    }

    const cierre = await cerrarSesion(sesionActual.id_sesion_caja, datos);
    setSesionActual(null);
    setCajas((actuales) => actuales.map((caja) => (
      String(caja.id_caja) === String(idCajaSeleccionada)
        ? {
          ...caja,
          id_sesion_abierta: null,
          turno: null,
          fecha_hora_apertura: null,
        }
        : caja
    )));
    return cierre;
  }, 'No se pudo cerrar la sesión de caja.'), [
    ejecutarOperacion,
    idCajaSeleccionada,
    sesionActual,
  ]);

  return {
    cajas,
    cajaSeleccionada,
    idCajaSeleccionada,
    sesionActual,
    cargandoCajas,
    cargandoSesion,
    procesando,
    cargando: cargandoCajas || cargandoSesion,
    error,
    seleccionarCaja,
    abrir,
    registrar,
    cerrar,
    refrescarCajas,
    limpiarError,
  };
}
