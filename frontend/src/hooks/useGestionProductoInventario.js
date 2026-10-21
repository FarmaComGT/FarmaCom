import { useCallback, useState } from 'react';

export default function useGestionProductoInventario({
  crearProducto,
  actualizarProducto,
  cambiarEstado,
  refrescarInventario,
  onExito,
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);
  const [productoHistorial, setProductoHistorial] = useState(null);

  const abrirNuevo = useCallback(() => {
    setProductoEditando(null);
    setErrorFormulario(null);
    setMostrarFormulario(true);
  }, []);

  const abrirEdicion = useCallback((producto) => {
    setProductoEditando(producto);
    setErrorFormulario(null);
    setMostrarFormulario(true);
  }, []);

  const cerrarFormulario = useCallback(() => {
    if (guardando) return;
    setMostrarFormulario(false);
    setProductoEditando(null);
    setErrorFormulario(null);
  }, [guardando]);

  const guardar = useCallback(async (payload) => {
    try {
      setGuardando(true);
      setErrorFormulario(null);
      if (productoEditando) {
        await actualizarProducto(productoEditando.id_producto, payload);
        onExito?.(`Producto ${payload.nombre_comercial} actualizado correctamente.`);
      } else {
        await crearProducto(payload);
        onExito?.(`Producto ${payload.nombre_comercial} creado correctamente.`);
      }
      await refrescarInventario();
      setMostrarFormulario(false);
      setProductoEditando(null);
    } catch (error) {
      setErrorFormulario(error.message || 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
  }, [
    actualizarProducto,
    crearProducto,
    onExito,
    productoEditando,
    refrescarInventario,
  ]);

  const alternarEstado = useCallback(async (producto) => {
    try {
      setCambiandoEstadoId(producto.id_producto);
      setErrorAccion(null);
      await cambiarEstado(producto.id_producto, !producto.activo);
      await refrescarInventario();
    } catch (error) {
      setErrorAccion(error.message || 'No se pudo cambiar el estado del producto.');
    } finally {
      setCambiandoEstadoId(null);
    }
  }, [cambiarEstado, refrescarInventario]);

  return {
    mostrarFormulario,
    productoEditando,
    guardando,
    errorFormulario,
    errorAccion,
    cambiandoEstadoId,
    productoHistorial,
    abrirNuevo,
    abrirEdicion,
    cerrarFormulario,
    guardar,
    alternarEstado,
    mostrarHistorial: setProductoHistorial,
    cerrarHistorial: () => setProductoHistorial(null),
  };
}
