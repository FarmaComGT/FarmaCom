import React from 'react';
import { ChevronDown } from 'lucide-react';

const Selector = ({ children, ...props }) => (
  <div className="relative">
    <select {...props} className="w-full appearance-none rounded-xl border border-slate-300 px-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-slate-100 disabled:text-slate-400">
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
  </div>
);

export default function ProductoClasificacion({
  formulario,
  categorias,
  casas,
  proveedores,
  cargandoDatos,
  onChange,
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Categoría <span className="text-error">*</span></label>
          <Selector name="id_categoria" value={formulario.id_categoria} onChange={onChange} required disabled={cargandoDatos}>
            <option value="">Seleccionar...</option>
            {(categorias || []).map((categoria) => <option key={categoria.id_categoria} value={categoria.id_categoria}>{categoria.nombre}</option>)}
          </Selector>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Casa farmacéutica <span className="text-error">*</span></label>
          <Selector name="id_casa" value={formulario.id_casa} onChange={onChange} required disabled={cargandoDatos}>
            <option value="">Seleccionar...</option>
            {(casas || []).filter((casa) => casa.activo).map((casa) => <option key={casa.id_casa} value={casa.id_casa}>{casa.nombre}</option>)}
          </Selector>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Proveedor</label>
        <Selector name="id_proveedor" value={formulario.id_proveedor} onChange={onChange} disabled={cargandoDatos}>
          <option value="">Sin proveedor</option>
          {(proveedores || []).map((proveedor) => <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>{proveedor.nombre}</option>)}
        </Selector>
      </div>
    </>
  );
}
