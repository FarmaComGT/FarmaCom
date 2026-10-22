import { useCallback, useState } from 'react';

export default function useGestionLotesProducto({
  crearLote,
  actualizarLote,
  eliminarLote,
  limpiarError,
  onCambio,
  onExito,
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loteEditando, setLoteEditando] = useState(null);
  const [loteAEliminar, setLoteAEliminar] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const abrirNuevo = useCallback(() => {
    limpiarError();
    setLoteEditando(null);
    setMostrarFormulario(true);
  }, [limpiarError]);

  const abrirEdicion = useCallback((lote) => {
    limpiarError();
    setLoteEditando(lote);
    setMostrarFormulario(true);
  }, [limpiarError]);

  const cerrarFormulario = useCallback(() => {
    limpiarError();
    setMostrarFormulario(false);
    setLoteEditando(null);
  }, [limpiarError]);

  const guardar = useCallback(async (payload) => {
    try {
      if (loteEditando) {
        await actualizarLote(loteEditando.id_lote, payload);
        onExito?.(`Lote ${payload.numero_lote} actualizado correctamente.`);
      } else {
        await crearLote(payload);
        onExito?.(`Lote ${payload.numero_lote} creado correctamente.`);
      }
      await onCambio?.();
      setMostrarFormulario(false);
      setLoteEditando(null);
      setRefreshKey((valor) => valor + 1);
    } catch {
      // useLotes conserva el error para mostrarlo en el modal.
    }
  }, [actualizarLote, crearLote, loteEditando, onCambio, onExito]);

  const solicitarEliminacion = useCallback((lote) => {
    limpiarError();
    setLoteAEliminar(lote);
  }, [limpiarError]);

  const cancelarEliminacion = useCallback(() => {
    limpiarError();
    setLoteAEliminar(null);
  }, [limpiarError]);

  const confirmarEliminacion = useCallback(async () => {
    if (!loteAEliminar) return;
    try {
      const numeroLote = loteAEliminar.numero_lote;
      await eliminarLote(loteAEliminar.id_lote);
      await onCambio?.();
      setLoteAEliminar(null);
      setRefreshKey((valor) => valor + 1);
      onExito?.(`Lote ${numeroLote} eliminado correctamente.`);
    } catch {
      // useLotes conserva el error para mostrarlo en el modal.
    }
  }, [eliminarLote, loteAEliminar, onCambio, onExito]);

  return {
    mostrarFormulario,
    loteEditando,
    loteAEliminar,
    refreshKey,
    abrirNuevo,
    abrirEdicion,
    cerrarFormulario,
    guardar,
    solicitarEliminacion,
    cancelarEliminacion,
    confirmarEliminacion,
  };
}
