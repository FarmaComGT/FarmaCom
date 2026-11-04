import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const RESUMEN_INICIAL = {
  total_productos: 0, productos_sin_lotes: 0, productos_agotados: 0,
  productos_poco_stock: 0, productos_vencidos: 0, productos_criticos: 0,
  productos_proximos_vencer: 0, productos_optimos: 0,
};

const useInventarioSucursal = (idSucursal, {
  pagina = 1, limite = 25, busqueda = '', id_categoria = '',
  estado_stock = '', estado_vencimiento = '', activo = '',
} = {}) => {
  const claveConsulta = JSON.stringify([idSucursal, pagina, limite, busqueda, id_categoria, estado_stock, estado_vencimiento, activo]);
  const [consultaResuelta, setConsultaResuelta] = useState(null);
  const [productos, setProductos] = useState([]);
  const [paginacion, setPaginacion] = useState(null);
  const [resumen, setResumen] = useState(RESUMEN_INICIAL);
  const [cargando, setCargando] = useState(Boolean(idSucursal));
  const [cargandoResumen, setCargandoResumen] = useState(Boolean(idSucursal));
  const [error, setError] = useState(null);
  const [errorResumen, setErrorResumen] = useState(null);
  const [revision, setRevision] = useState(0);
  const [busquedaAplicada, setBusquedaAplicada] = useState(busqueda);
  const refrescar = useCallback(() => setRevision((valor) => valor + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => setBusquedaAplicada(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    const controller = new AbortController();
    let vigente = true;
    setPaginacion(null);
    setError(null);
    if (!idSucursal) {
      setProductos([]);
      setCargando(false);
      return () => { vigente = false; controller.abort(); };
    }
    setCargando(true);
    // No consultar con una búsqueda pendiente; tampoco dejar que responda la anterior.
    if (busqueda !== busquedaAplicada) return () => { vigente = false; controller.abort(); };
    const params = { pagina, limite };
    Object.entries({ busqueda: busquedaAplicada.trim(), id_categoria, estado_stock, estado_vencimiento, activo })
      .forEach(([campo, valor]) => { if (valor !== '') params[campo] = valor; });
    api.get(`/sucursales/${idSucursal}/inventario`, { params, signal: controller.signal })
      .then(({ data }) => {
        if (!vigente) return;
        setProductos(data.datos);
        setPaginacion(data.paginacion);
      })
      .catch((err) => {
        if (vigente) setError(err.response?.data?.mensaje || 'Error al cargar el inventario');
      })
      .finally(() => { if (vigente) { setConsultaResuelta(claveConsulta); setCargando(false); } });
    return () => { vigente = false; controller.abort(); };
  }, [idSucursal, pagina, limite, busqueda, busquedaAplicada, id_categoria, estado_stock, estado_vencimiento, activo, revision, claveConsulta]);

  useEffect(() => {
    const controller = new AbortController();
    let vigente = true;
    setErrorResumen(null);
    setResumen(RESUMEN_INICIAL);
    if (!idSucursal) {
      setCargandoResumen(false);
      return () => { vigente = false; controller.abort(); };
    }
    setCargandoResumen(true);
    api.get(`/sucursales/${idSucursal}/inventario/resumen`, { signal: controller.signal })
      .then(({ data }) => { if (vigente) setResumen(data); })
      .catch((err) => {
        if (vigente) setErrorResumen(err.response?.data?.mensaje || 'Error al cargar el resumen');
      })
      .finally(() => { if (vigente) setCargandoResumen(false); });
    return () => { vigente = false; controller.abort(); };
  }, [idSucursal, revision]);

  return {
    productos, paginacion: consultaResuelta === claveConsulta ? paginacion : null, resumen,
    cargando: cargando || Boolean(idSucursal && consultaResuelta !== claveConsulta),
    cargandoResumen, error, errorResumen, refrescar,
  };
};

export default useInventarioSucursal;
