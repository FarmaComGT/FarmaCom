import React from 'react';
import { History, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ProductoTableRow({
  producto,
  onEditar,
  onCambiarEstado,
  onVerHistorial,
  puedeVerHistorial,
  cambiandoEstado,
}) {
  const esActivo = producto.activo;

  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-white/60 hover:bg-surface-container-low/40 transition-colors group">

      {/* Código */}
      <span className="col-span-1 font-mono text-xs text-slate-400 truncate">
        {producto.codigo}
      </span>

      {/* Nombre comercial + presentación + genérico */}
      <div className="col-span-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-primary truncate">{producto.nombre_comercial}</p>
          {producto.presentacion && (
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary">
              {producto.presentacion}
            </span>
          )}
        </div>
        {producto.nombre_generico && (
          <p className="text-xs text-slate-400 truncate">
            {producto.nombre_generico}
            {producto.concentracion ? ` · ${producto.concentracion}` : ''}
          </p>
        )}
      </div>

      {/* Categoría / Casa */}
      <div className="col-span-2 min-w-0">
        <p className="text-sm text-slate-700 truncate">{producto.categoria_nombre ?? '—'}</p>
        <p className="text-xs text-slate-400 truncate">{producto.casa_nombre ?? '—'}</p>
      </div>

      {/* Proveedor */}
      <span className="col-span-2 text-sm text-slate-600 truncate">
        {producto.proveedor_nombre ?? <span className="text-slate-300 italic">Sin asignar</span>}
      </span>

      {/* Precio compra */}
      <span className="col-span-1 text-right font-medium text-slate-700 text-sm">
        Q{Number(producto.precio_compra).toFixed(2)}
      </span>

      {/* Stock mínimo */}
      <div className="col-span-1 flex justify-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-container/40 text-on-secondary-container border border-secondary/10">
          {producto.stock_minimo} u
        </span>
      </div>

      {/* Estado */}
      <div className="col-span-1 flex justify-center">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            esActivo
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-600 border border-red-200'
          }`}
        >
          {esActivo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Acciones */}
      <div className="col-span-1 flex justify-center gap-1.5">
        {puedeVerHistorial && (
          <button
            type="button"
            onClick={() => onVerHistorial(producto)}
            title="Historial de precios"
            aria-label={`Ver historial de precios de ${producto.nombre_comercial}`}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <History className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onEditar(producto)}
          title="Editar"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-surface-container-high hover:text-primary transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onCambiarEstado(producto)}
          disabled={cambiandoEstado}
          title={esActivo ? 'Desactivar' : 'Activar'}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            esActivo
              ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
              : 'text-slate-500 hover:bg-green-50 hover:text-green-700'
          }`}
        >
          {esActivo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
