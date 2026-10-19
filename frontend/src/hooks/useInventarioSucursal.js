import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// Hook para la pantalla de inventario de una sucursal
const useInventarioSucursal = (idSucursal) => {
  const [productos, setProductos] = useState([]);
  const [resumen, setResumen] = useState({
    total_productos: 0,
    productos_sin_lotes: 0,
    productos_agotados: 0,
    productos_poco_stock: 0,
    productos_vencidos: 0,
    productos_criticos: 0,
    productos_proximos_vencer: 0,
    productos_optimos: 0,
  });
  const [cargando, setCargando] = useState(false);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [error, setError] = useState(null);

  const cargarInventario = useCallback(async () => {
    if (!idSucursal) return;

    setCargando(true);
    setCargandoResumen(true);
    setError(null);

    try {
      const [respProductos, respResumen] = await Promise.all([
        api.get(`/sucursales/${idSucursal}/inventario`),
        api.get(`/sucursales/${idSucursal}/inventario/resumen`),
      ]);

      setProductos(respProductos.data);
      setResumen(respResumen.data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar el inventario');
    } finally {
      setCargando(false);
      setCargandoResumen(false);
    }
  }, [idSucursal]);

  useEffect(() => {
    cargarInventario();
  }, [cargarInventario]);

  return {
    productos,
    resumen,
    cargando,
    cargandoResumen,
    error,
    refrescar: cargarInventario,
  };
};

export default useInventarioSucursal;
