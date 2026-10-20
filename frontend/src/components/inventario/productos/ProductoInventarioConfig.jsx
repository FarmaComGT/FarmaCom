import React from 'react';

export default function ProductoInventarioConfig({ formulario, onChange }) {
  return (
    <>
      <div className="pt-1">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Métricas de inventario</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Precio sugerido de compra (Q) <span className="text-error">*</span></label>
            <input type="number" name="precio_compra" value={formulario.precio_compra} onChange={onChange} placeholder="0.00" min="0" step="0.01" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            <p className="text-xs text-slate-500">Se usa como valor inicial en lotes nuevos; los lotes existentes conservan su propio costo.</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Stock mínimo</label>
            <input type="number" name="stock_minimo" value={formulario.stock_minimo} onChange={onChange} placeholder="0" min="0" step="1" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>
        <div className="space-y-1 mt-4">
          <label className="text-sm font-semibold text-slate-700">Meses alerta vencimiento <span className="text-error">*</span></label>
          <input type="number" name="meses_alerta_vencimiento" value={formulario.meses_alerta_vencimiento} onChange={onChange} placeholder="Ej. 6" min="1" step="1" required className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
        </div>
      </div>
      <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
        <input type="checkbox" name="aplica_mayoreo" checked={formulario.aplica_mayoreo} onChange={onChange} className="mt-0.5 h-4 w-4 rounded accent-primary cursor-pointer" />
        <div>
          <p className="text-sm font-semibold text-slate-700">Aplica para mayoreo</p>
          <p className="text-xs text-slate-500">Permite precios especiales por volumen</p>
        </div>
      </label>
    </>
  );
}
