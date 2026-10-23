import React from 'react';
import { ChevronDown } from 'lucide-react';

const Icono = () => <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />;
const claseSelect = 'w-full appearance-none rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-400';
const claseInput = 'w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';

export default function LoteDatosSection({ formulario, productos, proveedores, sucursales, presentacion, modoEdicion, bloquearProducto, cargandoDatos, fechaMinima, onChange, onPrecioChange }) {
  return (
    <section className="space-y-4">
      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Datos del lote</p>
      <div className="space-y-1">
        <label htmlFor="producto_lote" className="text-sm font-semibold text-slate-700">Producto <span className="text-error">*</span></label>
        <div className="relative"><select id="producto_lote" name="id_producto" value={formulario.id_producto} onChange={onChange} disabled={cargandoDatos || bloquearProducto} required className={claseSelect}>
          <option value="">Seleccionar producto...</option>
          {productos.map((producto) => <option key={producto.id_producto} value={producto.id_producto}>{producto.nombre_comercial}{producto.concentracion ? ` ${producto.concentracion}` : ''}{producto.presentacion ? ` · ${producto.presentacion}` : ''} - {producto.codigo}</option>)}
        </select><Icono /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1"><label htmlFor="precio_compra_lote" className="text-sm font-semibold text-slate-700">Precio compra <span className="text-error">*</span></label><input id="precio_compra_lote" type="number" value={formulario.precio_compra} onChange={(e) => onPrecioChange('precio_compra', e.target.value)} min="0" step="0.01" required placeholder="0.00" className={claseInput} /><p className="text-xs text-slate-500">Se precarga con el valor sugerido del producto y se guarda para este lote.</p></div>
        <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">Proveedor <span className="text-error">*</span></label><div className="relative"><select name="id_proveedor" value={formulario.id_proveedor} onChange={onChange} disabled={cargandoDatos} required className={claseSelect}><option value="">Seleccionar...</option>{(proveedores || []).filter((item) => item.activo || String(item.id_proveedor) === String(formulario.id_proveedor)).map((item) => <option key={item.id_proveedor} value={item.id_proveedor}>{item.nombre}</option>)}</select><Icono /></div></div>
      </div>
      {modoEdicion && <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">Stock actual <span className="text-error">*</span></label><input type="number" name="stock_actual" value={formulario.stock_actual} onChange={onChange} min="0" step="1" required className={claseInput} /><p className="text-xs text-slate-500">No puede superar la cantidad ingresada del lote.</p></div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">Sucursal <span className="text-error">*</span></label><div className="relative"><select name="id_sucursal" value={formulario.id_sucursal} onChange={onChange} disabled={cargandoDatos} required className={claseSelect}><option value="">Seleccionar...</option>{(sucursales || []).map((item) => <option key={item.id_sucursal} value={item.id_sucursal}>{item.nombre_sucursal}</option>)}</select><Icono /></div></div>
        <div className="space-y-1"><label htmlFor="numero_lote" className="text-sm font-semibold text-slate-700">Número de lote <span className="text-error">*</span></label><input id="numero_lote" type="text" name="numero_lote" value={formulario.numero_lote} onChange={onChange} placeholder="Ej. LT-2026-001" maxLength={100} required className={claseInput} /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">Vencimiento <span className="text-error">*</span></label><input type="date" name="fecha_vencimiento" value={formulario.fecha_vencimiento} onChange={onChange} min={fechaMinima} required className={claseInput} /></div>
        <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">Cantidad ingresada <span className="text-error">*</span></label><input type="number" name="cantidad_ingresada" value={formulario.cantidad_ingresada} onChange={onChange} placeholder="0" min="1" step="1" required className={claseInput} /></div>
      </div>
      <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">Presentación</label><input type="text" value={presentacion || 'Depende del producto seleccionado'} disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500" /><p className="text-xs text-slate-500">La presentación viene del producto. Si necesitas otra, regístrala como un producto aparte.</p></div>
    </section>
  );
}
