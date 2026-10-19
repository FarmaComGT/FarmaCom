import React from 'react';
import { Boxes, History, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import EstadoInventarioBadge from './EstadoInventarioBadge.jsx';

const columnas = 'grid-cols-[100px_minmax(240px,2fr)_minmax(170px,1fr)_100px_135px_145px_90px_120px]';

function InventarioProductoRow({
  producto,
  onEditar,
  onCambiarEstado,
  onVerHistorial,
  onVerLotes,
  puedeVerHistorial,
  cambiandoEstado,
}) {
  return (
    <div className={`grid ${columnas} items-center gap-4 px-5 py-4 hover:bg-surface-container-low/40`}>
      <span className="truncate font-mono text-xs text-slate-400">{producto.codigo}</span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-bold text-primary">{producto.nombre_comercial}</p>
          {producto.presentacion && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {producto.presentacion}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-400">
          {producto.nombre_generico || 'Sin nombre genérico'}
          {producto.concentracion ? ` · ${producto.concentracion}` : ''}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm text-slate-700">{producto.categoria_nombre || '—'}</p>
        <p className="truncate text-xs text-slate-400">{producto.casa_nombre || '—'}</p>
      </div>

      <div className="text-right">
        <p className="font-black text-primary">
          {Number(producto.stock_total || 0).toLocaleString('es-GT')}
        </p>
        <p className="text-[10px] text-slate-400">Mín. {producto.stock_minimo ?? 0}</p>
      </div>

      <div className="text-center">
        <EstadoInventarioBadge tipo="stock" estado={producto.estado_stock} />
      </div>

      <div className="text-center">
        <EstadoInventarioBadge tipo="vencimiento" estado={producto.estado_vencimiento} />
      </div>

      <div className="text-center">
        <p className="font-bold text-slate-700">{producto.total_lotes ?? 0}</p>
        <p className="text-[10px] text-slate-400">lotes</p>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onVerLotes(producto)}
          aria-label={`Ver lotes de ${producto.nombre_comercial}`}
          title="Ver lotes"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-primary/10 hover:text-primary"
        >
          <Boxes className="h-4 w-4" />
        </button>
        {puedeVerHistorial && (
          <button
            type="button"
            onClick={() => onVerHistorial(producto)}
            aria-label={`Ver historial de precios de ${producto.nombre_comercial}`}
            title="Historial de precios"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-primary/10 hover:text-primary"
          >
            <History className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onEditar(producto)}
          aria-label={`Editar ${producto.nombre_comercial}`}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onCambiarEstado(producto)}
          disabled={cambiandoEstado}
          aria-label={`${producto.activo ? 'Desactivar' : 'Activar'} ${producto.nombre_comercial}`}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
        >
          {producto.activo
            ? <ToggleRight className="h-4 w-4" />
            : <ToggleLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function InventarioProductosTable({
  productos,
  cargando,
  onEditar,
  onCambiarEstado,
  onVerHistorial,
  onVerLotes,
  puedeVerHistorial,
  cambiandoEstadoId,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className={`grid ${columnas} gap-4 border-b border-slate-200 bg-surface-container-low px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500`}>
            <span>Código</span>
            <span>Producto</span>
            <span>Categoría / Casa</span>
            <span className="text-right">Stock</span>
            <span className="text-center">Estado stock</span>
            <span className="text-center">Vencimiento</span>
            <span className="text-center">Lotes</span>
            <span className="text-right">Acciones</span>
          </div>

          {cargando ? (
            <p className="px-6 py-12 text-center text-sm font-medium text-slate-500">
              Cargando inventario...
            </p>
          ) : productos.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm font-medium text-slate-400">
              No hay productos que coincidan con los filtros.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {productos.map((producto) => (
                <InventarioProductoRow
                  key={producto.id_producto}
                  producto={producto}
                  onEditar={onEditar}
                  onCambiarEstado={onCambiarEstado}
                  onVerHistorial={onVerHistorial}
                  onVerLotes={onVerLotes}
                  puedeVerHistorial={puedeVerHistorial}
                  cambiandoEstado={cambiandoEstadoId === producto.id_producto}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
