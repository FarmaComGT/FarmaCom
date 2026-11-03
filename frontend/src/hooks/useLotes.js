import { useCallback, useState } from 'react';
import api from '../api/axios';

const obtenerMensajeError = (err, fallback) => {
  if (err.response?.data?.mensaje) return err.response.data.mensaje;

  const errores = err.response?.data?.errores;
  if (Array.isArray(errores) && errores.length > 0) {
    return errores[0].msg || fallback;
  }

  return fallback;
};

const useLotes = () => {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const crear = useCallback(async (payload) => {
    setGuardando(true);
    setError(null);

    try {
      const { data } = await api.post('/lotes', payload);
      return data;
    } catch (err) {
      const mensaje = err.response
        ? obtenerMensajeError(err, 'Error al crear lote')
        : err.message || 'Error al crear lote';
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setGuardando(false);
    }
  }, []);

  const actualizar = useCallback(async (idLote, payload) => {
    setGuardando(true);
    setError(null);

    try {
      const { data } = await api.patch(`/lotes/${idLote}`, payload);
      return data;
    } catch (err) {
      const mensaje = err.response
        ? obtenerMensajeError(err, 'Error al actualizar lote')
        : err.message || 'Error al actualizar lote';
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setGuardando(false);
    }
  }, []);

  const eliminar = useCallback(async (idLote) => {
    setGuardando(true);
    setError(null);

    try {
      const { data } = await api.delete(`/lotes/${idLote}`);
      return data;
    } catch (err) {
      const mensaje = err.response
        ? obtenerMensajeError(err, 'Error al eliminar lote')
        : err.message || 'Error al eliminar lote';
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setGuardando(false);
    }
  }, []);

  const ajustarStock = useCallback(async (idLote, payload) => {
    setGuardando(true);
    setError(null);
    try {
      const { data } = await api.patch(`/lotes/${idLote}/stock`, payload);
      return data;
    } catch (err) {
      const mensaje = err.response
        ? obtenerMensajeError(err, 'Error al ajustar las existencias')
        : err.message || 'Error al ajustar las existencias';
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setGuardando(false);
    }
  }, []);

  const limpiarError = useCallback(() => {
    setError(null);
  }, []);

  return {
    guardando,
    error,
    crear,
    actualizar,
    eliminar,
    ajustarStock,
    limpiarError,
  };
};

export default useLotes;
