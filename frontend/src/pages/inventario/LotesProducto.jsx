import React, { useMemo, useState } from 'react';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import InventarioSubNav from '../../components/inventario/InventarioSubNav.jsx';
import LoteDeleteModal from '../../components/inventario/stock/LoteDeleteModal.jsx';
import LoteFormModal from '../../components/inventario/stock/LoteFormModal.jsx';
import LotesDeProductoTable from '../../components/inventario/stock/LotesDeProductoTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useGestionLotesProducto from '../../hooks/useGestionLotesProducto.js';
import useLotes from '../../hooks/useLotes.js';
import useProductos from '../../hooks/useProductos.js';
import useProveedores from '../../hooks/useProveedores.js';
import useSucursales from '../../hooks/useSucursales.js';

export default function LotesProducto() {
  const { productoId } = useParams();
  const { sucursalActivaId, usuario } = useAuth();
  const [sucursalId, setSucursalId] = useState(sucursalActivaId);
  const [filtroStock, setFiltroStock] = useState('');
  const [filtroVencimiento, setFiltroVencimiento] = useState('');
  const [mensajeAccion, setMensajeAccion] = useState(null);
  const { productos, cargando: cargandoProductos, error: errorProductos } = useProductos();
  const { proveedores, cargando: cargandoProveedores } = useProveedores();
  const { sucursales, cargando: cargandoSucursales } = useSucursales();
  const {
    guardando,
    error: errorLote,
    crear,
    actualizar,
    eliminar,
    limpiarError,
  } = useLotes();
  const producto = useMemo(
    () => productos.find((item) => String(item.id_producto) === String(productoId)),
    [productoId, productos],
  );
  const gestion = useGestionLotesProducto({
    crearLote: crear,
    actualizarLote: actualizar,
    eliminarLote: eliminar,
    limpiarError,
    onExito: setMensajeAccion,
  });
  const puedeGestionar = ['dueno', 'administrador'].includes(usuario?.rol);
  const cargandoCatalogos = cargandoProductos || cargandoProveedores || cargandoSucursales;

  if (!cargandoProductos && !producto) {
    return (
      <div className="space-y-6">
        <InventarioSubNav />
        <Link to="/inventario" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver al inventario
        </Link>
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {errorProductos || 'No se encontró el producto solicitado.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventarioSubNav />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/inventario" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-primary">
            <ArrowLeft className="h-4 w-4" /> Volver al inventario
          </Link>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
            Lotes de {producto?.nombre_comercial || 'producto'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {producto?.codigo}
            {producto?.concentracion ? ` · ${producto.concentracion}` : ''}
            {producto?.presentacion ? ` · ${producto.presentacion}` : ''}
          </p>
        </div>

        {puedeGestionar && (
          <button
            type="button"
            onClick={gestion.abrirNuevo}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            <PackagePlus className="h-4 w-4" /> Agregar lote
          </button>
        )}
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Sucursal</span>
          <select
            aria-label="Sucursal"
            value={sucursalId ?? ''}
            onChange={(evento) => setSucursalId(evento.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          >
            {sucursales.map((sucursal) => (
              <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                {sucursal.nombre_sucursal}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Stock</span>
          <select
            aria-label="Estado de stock"
            value={filtroStock}
            onChange={(evento) => setFiltroStock(evento.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          >
            <option value="">Todos</option>
            <option value="normal">Con existencias</option>
            <option value="agotado">Agotados</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-700">
          <span>Vencimiento</span>
          <select
            aria-label="Estado de vencimiento"
            value={filtroVencimiento}
            onChange={(evento) => setFiltroVencimiento(evento.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          >
            <option value="">Todos</option>
            <option value="normal">Vigentes</option>
            <option value="proximo_a_vencer">Próximos a vencer</option>
            <option value="vencido">Vencidos</option>
          </select>
        </label>
      </section>

      {mensajeAccion && (
        <div role="status" className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          {mensajeAccion}
        </div>
      )}

      {producto && (
        <LotesDeProductoTable
          producto={producto}
          sucursalId={sucursalId}
          activo
          refreshKey={gestion.refreshKey}
          filtroStock={filtroStock}
          filtroVencimiento={filtroVencimiento}
          onEditar={puedeGestionar ? gestion.abrirEdicion : undefined}
          onEliminar={puedeGestionar ? gestion.solicitarEliminacion : undefined}
        />
      )}

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
        errorFormulario={errorLote}
        onClose={gestion.cerrarFormulario}
        onSubmit={gestion.guardar}
      />

      <LoteDeleteModal
        isOpen={Boolean(gestion.loteAEliminar)}
        lote={gestion.loteAEliminar}
        eliminando={guardando}
        error={errorLote}
        onClose={gestion.cancelarEliminacion}
        onConfirm={gestion.confirmarEliminacion}
      />
    </div>
  );
}
