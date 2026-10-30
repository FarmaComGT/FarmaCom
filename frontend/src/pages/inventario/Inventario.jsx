import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, PackagePlus } from 'lucide-react';
import './Inventario.css';
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
import useGestionLotesProducto from '../../hooks/useGestionLotesProducto.js';
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
  const { sucursalActivaId, usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const sucursalId = Number(params.get('sucursal')) || sucursalActivaId;
  const busqueda = params.get('q') || '';
  const filtros = useMemo(() => Object.fromEntries(
    Object.keys(FILTROS_INVENTARIO_INICIALES).map((campo) => [campo, params.get(campo) || '']),
  ), [params]);
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);
  const actualizarVista = useCallback((cambios, replace = false) => {
    setParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.delete('pagina');
      Object.entries(cambios).forEach(([campo, valor]) => {
        if (valor === '' || valor == null) siguientes.delete(campo);
        else siguientes.set(campo, String(valor));
      });
      return siguientes;
    }, { replace });
  }, [setParams]);
  const setBusqueda = (valor) => actualizarVista({ q: valor }, true);
  const limpiarVista = () => actualizarVista({ ...FILTROS_INVENTARIO_INICIALES, q: '' });
  const [mensajeAccion, setMensajeAccion] = useState(null);

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
    document.title = 'Inventario · FarmaCom';
  }, []);

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
  const gestionLotes = useGestionLotesProducto({
    crearLote,
    limpiarError: limpiarErrorLote,
    onCambio: refrescarInventario,
    onExito: setMensajeAccion,
  });

  const cambiarSucursal = useCallback((id) => {
    actualizarVista({ sucursal: id, q: '', ...FILTROS_INVENTARIO_INICIALES });
  }, [actualizarVista]);

  const cambiarFiltro = useCallback((campo, valor) => {
    actualizarVista({ [campo]: valor });
  }, [actualizarVista]);

  const seleccionarResumen = useCallback((tipo, valor) => {
    actualizarVista(tipo
      ? { [tipo]: filtros[tipo] === valor ? '' : valor }
      : { estado_stock: '', estado_vencimiento: '' });
  }, [actualizarVista, filtros]);

  return (
    <div className="inventory-page">
      <header className="inventory-heading">
        <div><h1>Inventario</h1><p>Existencias y lotes por sucursal</p></div>
        <div className="inventory-heading-actions">
          <button type="button" className="inventory-button" onClick={gestionProducto.abrirNuevo}><Plus size={16} aria-hidden="true" />Nuevo producto</button>
          {puedeGestionarLotes && <button type="button" className="inventory-button inventory-primary" onClick={gestionLotes.abrirNuevo}><PackagePlus size={16} aria-hidden="true" />Ingresar lote</button>}
        </div>
      </header>

      <InventarioResumen
        resumen={resumen}
        filtros={filtros}
        cargando={cargando || Boolean(errorInventario)}
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
        onLimpiar={limpiarVista}
      />

      <div className="inventory-result-count">
        <p aria-live="polite" hidden={cargando || Boolean(errorInventario)}>
          Mostrando <strong className="text-primary">{productosFiltrados.length}</strong>
          {' '}de <strong className="text-primary">{productosInventario.length}</strong> productos.
        </p>
        {filtros.estado_stock && filtros.estado_vencimiento && (
          <p className="font-semibold text-primary">Los filtros de stock y vencimiento se combinan.</p>
        )}
      </div>

      {(errorCatalogo || gestionProducto.errorAccion) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorCatalogo || gestionProducto.errorAccion}
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
        puedeVerHistorial={puedeVerHistorial}
        cambiandoEstadoId={gestionProducto.cambiandoEstadoId}
        pagina={pagina}
        onPaginaChange={(valor) => actualizarVista({ pagina: valor })}
        onLimpiar={limpiarVista}
        error={errorInventario}
        onReintentar={refrescarInventario}
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
        isOpen={gestionLotes.mostrarFormulario}
        productos={productosCatalogo}
        proveedores={proveedores}
        sucursales={sucursales}
        sucursalInicialId={sucursalId}
        lote={null}
        cargandoDatos={cargandoDatosLote}
        guardando={guardandoLote}
        errorFormulario={errorLote}
        onClose={gestionLotes.cerrarFormulario}
        onSubmit={gestionLotes.guardar}
      />

      <HistorialPrecioProductoModal
        isOpen={Boolean(gestionProducto.productoHistorial)}
        producto={gestionProducto.productoHistorial}
        onClose={gestionProducto.cerrarHistorial}
      />
    </div>
  );
}
