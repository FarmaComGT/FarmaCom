import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventarioSubNav from '../../components/inventario/InventarioSubNav.jsx';
import ProductoFormModal from '../../components/inventario/productos/ProductoFormModal.jsx';
import HistorialPrecioProductoModal from '../../components/inventario/productos/HistorialPrecioProductoModal.jsx';
import LoteFormModal from '../../components/inventario/stock/LoteFormModal.jsx';
import InventarioFiltros from '../../components/inventario/unificado/InventarioFiltros.jsx';
import InventarioProductosTable from '../../components/inventario/unificado/InventarioProductosTable.jsx';
import InventarioResumen from '../../components/inventario/unificado/InventarioResumen.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useCasas from '../../hooks/useCasas.js';
import useCategorias from '../../hooks/useCategorias.js';
import useGestionProductoInventario from '../../hooks/useGestionProductoInventario.js';
import useInventarioSucursal from '../../hooks/useInventarioSucursal.js';
import useLotes from '../../hooks/useLotes.js';
import usePresentaciones from '../../hooks/usePresentaciones.js';
import useProductos from '../../hooks/useProductos.js';
import useProveedores from '../../hooks/useProveedores.js';
import useSucursales from '../../hooks/useSucursales.js';
import {
  FILTROS_INVENTARIO_INICIALES,
  filtrarProductosInventario,
  siguienteCodigoProducto,
} from '../../utils/inventario.js';

export default function Inventario() {
  const navigate = useNavigate();
  const { sucursalActivaId, usuario } = useAuth();
  const [sucursalId, setSucursalId] = useState(sucursalActivaId);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INVENTARIO_INICIALES);
  const [mensajeAccion, setMensajeAccion] = useState(null);
  const [mostrarLote, setMostrarLote] = useState(false);

  const {
    productos: productosInventario,
    resumen,
    cargando,
    error: errorInventario,
    refrescar: refrescarInventario,
  } = useInventarioSucursal(sucursalId);
  const {
    productos: productosCatalogo,
    error: errorCatalogo,
    crear: crearProducto,
    actualizar: actualizarProducto,
    cambiarEstado,
  } = useProductos();
  const { categorias, cargando: cargandoCategorias } = useCategorias();
  const { casas, cargando: cargandoCasas } = useCasas();
  const { proveedores, cargando: cargandoProveedores } = useProveedores();
  const { sucursales, cargando: cargandoSucursales } = useSucursales();
  const {
    presentaciones,
    cargando: cargandoPresentaciones,
    crear: crearPresentacion,
    actualizar: actualizarPresentacion,
    eliminar: eliminarPresentacion,
  } = usePresentaciones();
  const {
    guardando: guardandoLote,
    error: errorLote,
    crear: crearLote,
    limpiarError: limpiarErrorLote,
  } = useLotes();

  useEffect(() => {
    setSucursalId(sucursalActivaId);
  }, [sucursalActivaId]);

  const productosFiltrados = useMemo(
    () => filtrarProductosInventario(productosInventario, busqueda, filtros),
    [busqueda, filtros, productosInventario],
  );
  const codigoSugerido = useMemo(
    () => siguienteCodigoProducto(productosCatalogo),
    [productosCatalogo],
  );
  const cargandoCatalogos = cargandoCategorias
    || cargandoCasas
    || cargandoProveedores
    || cargandoPresentaciones;
  const cargandoDatosLote = cargandoSucursales || cargandoProveedores;
  const puedeGestionarLotes = ['dueno', 'administrador'].includes(usuario?.rol);
  const puedeVerHistorial = ['dueno', 'administrador'].includes(usuario?.rol);
  const gestionProducto = useGestionProductoInventario({
    crearProducto,
    actualizarProducto,
    cambiarEstado,
    refrescarInventario,
    onExito: setMensajeAccion,
  });

  const cambiarSucursal = useCallback((id) => {
    setSucursalId(id);
    setBusqueda('');
    setFiltros(FILTROS_INVENTARIO_INICIALES);
  }, []);

  const cambiarFiltro = useCallback((campo, valor) => {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }));
  }, []);

  const seleccionarResumen = useCallback((tipo, valor) => {
    setFiltros((actuales) => {
      if (!tipo) {
        return { ...actuales, estado_stock: '', estado_vencimiento: '' };
      }
      return {
        ...actuales,
        [tipo]: actuales[tipo] === valor ? '' : valor,
      };
    });
  }, []);

  const abrirNuevoLote = useCallback(() => {
    limpiarErrorLote();
    setMostrarLote(true);
  }, [limpiarErrorLote]);

  const guardarLote = useCallback(async (payload) => {
    try {
      await crearLote(payload);
      await refrescarInventario();
      setMostrarLote(false);
      setMensajeAccion(`Lote ${payload.numero_lote} creado correctamente.`);
    } catch {
      // El hook mantiene el error visible dentro del formulario.
    }
  }, [crearLote, refrescarInventario]);

  return (
    <div className="space-y-6">
      <InventarioSubNav />

      <header>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
          Inventario
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Administra productos, existencias y alertas desde una sola pantalla.
        </p>
      </header>

      <InventarioResumen
        resumen={resumen}
        filtros={filtros}
        cargando={cargando}
        onSeleccionar={seleccionarResumen}
      />

      <InventarioFiltros
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtros={filtros}
        onFiltroChange={cambiarFiltro}
        categorias={categorias}
        sucursalId={sucursalId}
        sucursales={sucursales}
        onSucursalChange={cambiarSucursal}
        onNuevoProducto={gestionProducto.abrirNuevo}
        onNuevoLote={abrirNuevoLote}
        puedeGestionarLotes={puedeGestionarLotes}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <p>
          Mostrando <strong className="text-primary">{productosFiltrados.length}</strong>
          {' '}de <strong className="text-primary">{productosInventario.length}</strong> productos.
        </p>
        {filtros.estado_stock && filtros.estado_vencimiento && (
          <p className="font-semibold text-primary">Los filtros de stock y vencimiento se combinan.</p>
        )}
      </div>

      {(errorInventario || errorCatalogo || gestionProducto.errorAccion) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorInventario || errorCatalogo || gestionProducto.errorAccion}
        </div>
      )}

      {mensajeAccion && (
        <div role="status" className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          {mensajeAccion}
        </div>
      )}

      <InventarioProductosTable
        productos={productosFiltrados}
        cargando={cargando}
        onEditar={gestionProducto.abrirEdicion}
        onCambiarEstado={gestionProducto.alternarEstado}
        onVerHistorial={gestionProducto.mostrarHistorial}
        onVerLotes={(producto) => navigate(`/inventario/productos/${producto.id_producto}/lotes`)}
        puedeVerHistorial={puedeVerHistorial}
        cambiandoEstadoId={gestionProducto.cambiandoEstadoId}
      />

      <ProductoFormModal
        isOpen={gestionProducto.mostrarFormulario}
        modoEdicion={Boolean(gestionProducto.productoEditando)}
        producto={gestionProducto.productoEditando}
        codigoSugerido={codigoSugerido}
        categorias={categorias}
        casas={casas}
        proveedores={proveedores}
        presentaciones={presentaciones}
        cargandoDatos={cargandoCatalogos}
        guardando={gestionProducto.guardando}
        errorFormulario={gestionProducto.errorFormulario}
        onClose={gestionProducto.cerrarFormulario}
        onSubmit={gestionProducto.guardar}
        onCrearPresentacion={crearPresentacion}
        onActualizarPresentacion={actualizarPresentacion}
        onEliminarPresentacion={eliminarPresentacion}
        puedeGestionarPresentaciones={['dueno', 'administrador'].includes(usuario?.rol)}
        puedeEliminarPresentaciones={usuario?.rol === 'dueno'}
      />

      <LoteFormModal
        isOpen={mostrarLote}
        productos={productosCatalogo}
        proveedores={proveedores}
        sucursales={sucursales}
        sucursalInicialId={sucursalId}
        lote={null}
        cargandoDatos={cargandoDatosLote}
        guardando={guardandoLote}
        errorFormulario={errorLote}
        onClose={() => {
          if (!guardandoLote) setMostrarLote(false);
        }}
        onSubmit={guardarLote}
      />

      <HistorialPrecioProductoModal
        isOpen={Boolean(gestionProducto.productoHistorial)}
        producto={gestionProducto.productoHistorial}
        onClose={gestionProducto.cerrarHistorial}
      />
    </div>
  );
}
