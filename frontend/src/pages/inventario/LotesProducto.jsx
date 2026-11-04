import { useToast } from '../../context/ToastContext.jsx';
import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, PackagePlus, RotateCcw } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ContentState from '../../components/ui/ContentState.jsx';
import LoteDeleteModal from '../../components/inventario/stock/LoteDeleteModal.jsx';
import LoteFormModal from '../../components/inventario/stock/LoteFormModal.jsx';
import LoteStockAjusteModal from '../../components/inventario/stock/LoteStockAjusteModal.jsx';
import LotesDeProductoTable from '../../components/inventario/stock/LotesDeProductoTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useGestionLotesProducto from '../../hooks/useGestionLotesProducto.js';
import useLotes from '../../hooks/useLotes.js';
import useProductos from '../../hooks/useProductos.js';
import useProveedores from '../../hooks/useProveedores.js';
import useSucursales from '../../hooks/useSucursales.js';
import styles from '../../styles/ManagementUI.module.css';

export default function LotesProducto() {
  const toast = useToast();
  const { productoId } = useParams();
  const { sucursalActivaId, usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const sucursalId = usuario?.rol === 'dependiente'
    ? String(usuario.id_sucursal || '')
    : params.get('sucursal') || String(sucursalActivaId || '');
  const filtroStock = params.get('stock') || '';
  const filtroVencimiento = params.get('vencimiento') || '';
  const { productos, cargando: cargandoProductos, error: errorProductos } = useProductos();
  const { proveedores, cargando: cargandoProveedores } = useProveedores();
  const { sucursales, cargando: cargandoSucursales } = useSucursales();
  const { guardando, crear, actualizar, eliminar, ajustarStock, limpiarError } = useLotes();
  const producto = useMemo(
    () => productos.find((item) => String(item.id_producto) === String(productoId)),
    [productoId, productos],
  );
  const sucursalesDisponibles = useMemo(() => (
    usuario?.rol === 'dependiente'
      ? sucursales.filter((item) => Number(item.id_sucursal) === Number(usuario.id_sucursal))
      : sucursales
  ), [sucursales, usuario?.id_sucursal, usuario?.rol]);
  const gestion = useGestionLotesProducto({
    crearLote: crear, actualizarLote: actualizar, eliminarLote: eliminar, ajustarStock,
    limpiarError, onExito: toast.success, onError: toast.error,
  });
  const puedeGestionar = ['dueno', 'administrador'].includes(usuario?.rol);
  const cargandoCatalogos = cargandoProductos || cargandoProveedores || cargandoSucursales;

  useEffect(() => {
    document.title = `${producto?.nombre_comercial ? `Lotes de ${producto.nombre_comercial}` : 'Lotes'} · FarmaCom`;
  }, [producto?.nombre_comercial]);

  const actualizarFiltro = (nombre, valor) => {
    setParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.delete('pagina');
      if (valor) siguientes.set(nombre, valor);
      else siguientes.delete(nombre);
      return siguientes;
    }, { replace: true });
  };

  const limpiarFiltros = () => {
    setParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.delete('stock');
      siguientes.delete('pagina');
      siguientes.delete('vencimiento');
      return siguientes;
    });
  };

  if (cargandoProductos) {
    return <section className={styles.page}><ContentState variant="loading" message="Cargando producto y lotes…" /></section>;
  }

  if (!producto) {
    return (
      <section className={styles.page} aria-labelledby="lotes-no-encontrado-title">
        <Link to="/inventario" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> Volver al inventario</Link>
        <h1 id="lotes-no-encontrado-title" className={styles.visuallyHidden}>Lotes del producto</h1>
        <ContentState
          variant="error"
          title="No se pudo abrir el producto."
          message={errorProductos || 'No se encontró el producto solicitado.'}
        />
      </section>
    );
  }

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="lotes-producto-title">
      <Link to="/inventario" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" /> Volver al inventario</Link>

      <header className={styles.heading}>
        <div className="min-w-0">
          <h1 id="lotes-producto-title">Lotes de {producto.nombre_comercial}</h1>
          <p className="break-words">
            {producto.codigo}
            {producto.nombre_generico ? ` · ${producto.nombre_generico}` : ''}
            {producto.concentracion ? ` · ${producto.concentracion}` : ''}
            {producto.presentacion ? ` · ${producto.presentacion}` : ''}
          </p>
        </div>
        {puedeGestionar && (
          <div className={styles.headingActions}>
            <button type="button" onClick={gestion.abrirNuevo} className={`${styles.button} ${styles.primary}`}>
              <PackagePlus size={16} aria-hidden="true" /> Agregar lote
            </button>
          </div>
        )}
      </header>

      <div className={styles.filterGrid} aria-label="Filtros de lotes">
        <div className={styles.field}>
          <label htmlFor="filtro-sucursal-lotes">Sucursal</label>
          <select id="filtro-sucursal-lotes" aria-label="Sucursal" value={sucursalId} onChange={(evento) => actualizarFiltro('sucursal', evento.target.value)} disabled={usuario?.rol === 'dependiente'} className={styles.input}>
            {sucursalesDisponibles.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="filtro-stock-lotes">Stock</label>
          <select id="filtro-stock-lotes" aria-label="Estado de stock" value={filtroStock} onChange={(evento) => actualizarFiltro('stock', evento.target.value)} className={styles.input}>
            <option value="">Todos</option><option value="normal">Con existencias</option><option value="agotado">Agotados</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="filtro-vencimiento-lotes">Vencimiento</label>
          <select id="filtro-vencimiento-lotes" aria-label="Estado de vencimiento" value={filtroVencimiento} onChange={(evento) => actualizarFiltro('vencimiento', evento.target.value)} className={styles.input}>
            <option value="">Todos</option><option value="normal">Vigentes</option><option value="proximo_a_vencer">Próximos a vencer</option><option value="vencido">Vencidos</option>
          </select>
        </div>
      </div>

      {(filtroStock || filtroVencimiento) && (
        <div className={styles.toolbar}>
          <button type="button" onClick={limpiarFiltros} className={styles.button}><RotateCcw size={15} aria-hidden="true" /> Restablecer filtros</button>
        </div>
      )}


      <LotesDeProductoTable
        producto={producto}
        sucursalId={sucursalId}
        activo
        refreshKey={gestion.refreshKey}
        filtroStock={filtroStock}
        filtroVencimiento={filtroVencimiento}
        onEditar={puedeGestionar ? gestion.abrirEdicion : undefined}
        onEliminar={puedeGestionar ? gestion.solicitarEliminacion : undefined}
        onAjustar={puedeGestionar ? gestion.solicitarAjuste : undefined}
      />

      <LoteFormModal
        isOpen={gestion.mostrarFormulario}
        productos={productos}
        proveedores={proveedores}
        sucursales={sucursales}
        productoInicialId={productoId}
        bloquearProducto
        sucursalInicialId={sucursalId}
        lote={gestion.loteEditando}
        cargandoDatos={cargandoCatalogos}
        guardando={guardando}
        errorFormulario={null}
        onClose={gestion.cerrarFormulario}
        onSubmit={gestion.guardar}
      />

      <LoteDeleteModal isOpen={Boolean(gestion.loteAEliminar)} lote={gestion.loteAEliminar} eliminando={guardando} error={null} onClose={gestion.cancelarEliminacion} onConfirm={gestion.confirmarEliminacion} />

      <LoteStockAjusteModal
        lote={gestion.loteAAjustar}
        guardando={guardando}
        error={null}
        onClose={gestion.cancelarAjuste}
        onSubmit={gestion.confirmarAjuste}
      />
    </section>
  );
}
