import { useCallback, useState } from 'react';

export default function useGestionLotesProducto({
  crearLote,
  actualizarLote,
  eliminarLote,
  ajustarStock,
  limpiarError,
  onCambio,
  onExito,
  onError,
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loteEditando, setLoteEditando] = useState(null);
  const [loteAEliminar, setLoteAEliminar] = useState(null);
  const [loteAAjustar, setLoteAAjustar] = useState(null);
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
        onExito?.(`Lote ${payload.numero_lote || loteEditando.numero_lote} actualizado correctamente.`);
      } else {
        const creado = await crearLote(payload);
        onExito?.(`Lote ${creado?.numero_lote || payload.numero_lote || 'nuevo'} creado correctamente.`);
      }
      await Promise.resolve().then(() => onCambio?.()).catch(() => onError?.('La operación se completó, pero no se pudo actualizar el inventario. Actualiza la vista.'));
      setMostrarFormulario(false);
      setLoteEditando(null);
      setRefreshKey((valor) => valor + 1);
    } catch (error) {
      onError?.(error.message || 'No se pudo completar la operación del lote.');
      // Otros consumidores pueden conservar el error en el modal.
    }
  }, [actualizarLote, crearLote, loteEditando, onCambio, onExito, onError]);

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
      await Promise.resolve().then(() => onCambio?.()).catch(() => onError?.('La operación se completó, pero no se pudo actualizar el inventario. Actualiza la vista.'));
      setLoteAEliminar(null);
      setRefreshKey((valor) => valor + 1);
      onExito?.(`Lote ${numeroLote} eliminado correctamente.`);
    } catch (error) {
      onError?.(error.message || 'No se pudo completar la operación del lote.');
      // Otros consumidores pueden conservar el error en el modal.
    }
  }, [eliminarLote, loteAEliminar, onCambio, onExito, onError]);

  const solicitarAjuste = useCallback((lote) => {
    limpiarError();
    setLoteAAjustar(lote);
  }, [limpiarError]);

  const cancelarAjuste = useCallback(() => {
    limpiarError();
    setLoteAAjustar(null);
  }, [limpiarError]);

  const confirmarAjuste = useCallback(async (payload) => {
    if (!loteAAjustar || !ajustarStock) return;
    try {
      await ajustarStock(loteAAjustar.id_lote, payload);
      await Promise.resolve().then(() => onCambio?.()).catch(() => onError?.('La operación se completó, pero no se pudo actualizar el inventario. Actualiza la vista.'));
      setLoteAAjustar(null);
      setRefreshKey((valor) => valor + 1);
      onExito?.(`Stock del lote ${loteAAjustar.numero_lote} ajustado correctamente.`);
    } catch (error) {
      onError?.(error.message || 'No se pudo completar la operación del lote.');
      // Otros consumidores pueden conservar el error en el modal.
    }
  }, [ajustarStock, loteAAjustar, onCambio, onExito, onError]);

  return {
    mostrarFormulario,
    loteEditando,
    loteAEliminar,
    loteAAjustar,
    refreshKey,
    abrirNuevo,
    abrirEdicion,
    cerrarFormulario,
    guardar,
    solicitarEliminacion,
    cancelarEliminacion,
    confirmarEliminacion,
    solicitarAjuste,
    cancelarAjuste,
    confirmarAjuste,
  };
}
