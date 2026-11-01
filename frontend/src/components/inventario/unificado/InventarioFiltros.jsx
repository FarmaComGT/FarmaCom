import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const SelectFiltro = ({ label, value, onChange, children }) => (
  <label className="inventory-field">
    <span>{label}</span>
    <select name={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
  </label>
);

export default function InventarioFiltros({ busqueda, onBusquedaChange, filtros, onFiltroChange,
  categorias, sucursalId, sucursales, onSucursalChange, onLimpiar }) {
  const cantidad = Object.values(filtros).filter(Boolean).length;
  return (
    <section className="inventory-toolbar" aria-label="Buscar y filtrar inventario">
      <div className="inventory-search-row">
        <label className="inventory-search">
          <span className="sr-only">Buscar productos</span>
          <Search size={18} aria-hidden="true" />
          <input name="buscar-producto" type="search" autoComplete="off" spellCheck={false}
            placeholder="Buscar nombre, genérico o código…" value={busqueda}
            onChange={(event) => onBusquedaChange(event.target.value)} />
        </label>
        {sucursales.length > 1 && (
          <label className="inventory-branch">
            <span className="sr-only">Sucursal</span>
            <select name="sucursal" value={sucursalId ?? ''} onChange={(event) => onSucursalChange(Number(event.target.value))}>
              {sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}
            </select>
          </label>
        )}
        {(cantidad > 0 || busqueda) && <button className="inventory-button inventory-clear" type="button" onClick={onLimpiar}><X size={15} aria-hidden="true" />Limpiar</button>}
      </div>
      <details className="inventory-filter-disclosure">
        <summary><SlidersHorizontal size={16} aria-hidden="true" />Filtros{cantidad > 0 && <span className="inventory-filter-count">{cantidad} activos</span>}</summary>
        <div className="inventory-filter-fields">
          <SelectFiltro label="Categoría" value={filtros.id_categoria} onChange={(v) => onFiltroChange('id_categoria', v)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </SelectFiltro>
          <SelectFiltro label="Stock" value={filtros.estado_stock} onChange={(v) => onFiltroChange('estado_stock', v)}>
            <option value="">Todos</option><option value="normal">Disponible</option><option value="poco_stock">Poco stock</option><option value="agotado">Agotado</option><option value="sin_lotes">Sin lotes</option>
          </SelectFiltro>
          <SelectFiltro label="Vencimiento" value={filtros.estado_vencimiento} onChange={(v) => onFiltroChange('estado_vencimiento', v)}>
            <option value="">Todos</option><option value="normal">Sin alertas</option><option value="proximo_a_vencer">Próximo a vencer</option><option value="vencido">Vencido</option>
          </SelectFiltro>
          <SelectFiltro label="Catálogo" value={filtros.activo} onChange={(v) => onFiltroChange('activo', v)}>
            <option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
          </SelectFiltro>
        </div>
      </details>
    </section>
  );
}
