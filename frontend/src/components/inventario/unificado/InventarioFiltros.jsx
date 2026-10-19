import React from 'react';
import { ChevronDown, PackagePlus, PlusCircle, Search, Store } from 'lucide-react';

const SelectFiltro = ({ label, value, onChange, children }) => (
  <label className="min-w-[170px] flex-1">
    <span className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {label}
    </span>
    <span className="relative block">
      <select
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </span>
  </label>
);

export default function InventarioFiltros({
  busqueda,
  onBusquedaChange,
  filtros,
  onFiltroChange,
  categorias,
  sucursalId,
  sucursales,
  onSucursalChange,
  onNuevoProducto,
  onNuevoLote,
  puedeGestionarLotes,
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="group relative min-w-0 flex-1">
          <span className="sr-only">Buscar productos</span>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" />
          <input
            type="search"
            placeholder="Buscar por nombre comercial, genérico o código..."
            value={busqueda}
            onChange={(evento) => onBusquedaChange(evento.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onNuevoProducto}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary hover:bg-primary/5"
          >
            <PlusCircle className="h-4 w-4" />
            Nuevo producto
          </button>
          {puedeGestionarLotes && (
            <button
              type="button"
              onClick={onNuevoLote}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary/90"
            >
              <PackagePlus className="h-4 w-4" />
              Ingresar lote
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-surface-container-low p-4">
        {sucursales.length > 1 && (
          <label className="min-w-[190px] flex-1">
            <span className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Sucursal
            </span>
            <span className="relative block">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              <select
                value={sucursalId ?? ''}
                onChange={(evento) => onSucursalChange(Number(evento.target.value))}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              >
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                    {sucursal.nombre_sucursal}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </span>
          </label>
        )}

        <SelectFiltro
          label="Categoría"
          value={filtros.id_categoria}
          onChange={(valor) => onFiltroChange('id_categoria', valor)}
        >
          <option value="">Todas</option>
          {categorias.map((categoria) => (
            <option key={categoria.id_categoria} value={categoria.id_categoria}>
              {categoria.nombre}
            </option>
          ))}
        </SelectFiltro>

        <SelectFiltro
          label="Stock"
          value={filtros.estado_stock}
          onChange={(valor) => onFiltroChange('estado_stock', valor)}
        >
          <option value="">Todos</option>
          <option value="normal">Disponible</option>
          <option value="poco_stock">Poco stock</option>
          <option value="agotado">Agotado</option>
          <option value="sin_lotes">Sin lotes</option>
        </SelectFiltro>

        <SelectFiltro
          label="Vencimiento"
          value={filtros.estado_vencimiento}
          onChange={(valor) => onFiltroChange('estado_vencimiento', valor)}
        >
          <option value="">Todos</option>
          <option value="normal">Sin alertas</option>
          <option value="proximo_a_vencer">Próximo a vencer</option>
          <option value="vencido">Vencido</option>
        </SelectFiltro>

        <SelectFiltro
          label="Catálogo"
          value={filtros.activo}
          onChange={(valor) => onFiltroChange('activo', valor)}
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </SelectFiltro>
      </div>
    </section>
  );
}
