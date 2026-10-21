import React from 'react';

const Campo = ({ label, value, onChange, min, step, required, placeholder }) => <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-error"> *</span>}</label><input type="number" value={value} onChange={(e) => onChange(e.target.value)} min={min} step={step} required={required} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder={placeholder} /></div>;

export default function LotePreciosSection({ formulario, onPrecioChange }) {
  return <section className="space-y-4"><p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Precios del lote</p><div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <Campo label="Margen %" value={formulario.margen_ganancia} onChange={(valor) => onPrecioChange('margen_ganancia', valor)} min="0" step="0.0001" required placeholder="0" />
    <Campo label="Precio venta" value={formulario.precio_venta} onChange={(valor) => onPrecioChange('precio_venta', valor)} min="0" step="0.01" required placeholder="0.00" />
    <Campo label="Precio mayoreo" value={formulario.precio_mayoreo} onChange={(valor) => onPrecioChange('precio_mayoreo', valor)} min="0" step="0.01" placeholder="0.00" />
    <Campo label="Cantidad mayoreo" value={formulario.cantidad_mayoreo} onChange={(valor) => onPrecioChange('cantidad_mayoreo', valor)} min="1" step="1" placeholder="0" />
  </div></div></section>;
}
