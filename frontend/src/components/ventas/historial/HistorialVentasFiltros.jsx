import React from 'react';
import { ChevronDown, RotateCcw, Search } from 'lucide-react';

export default function HistorialVentasFiltros({
  filtros,
  sucursales,
  cargandoSucursales,
  errorSucursales,
  errorFiltros,
  onFiltroChange,
  onAplicar,
  onRestablecer,
}) {
  const manejarEnvio = (event) => {
    event.preventDefault();
    onAplicar();
  };

  return (
    <form onSubmit={manejarEnvio} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2.5 text-sm font-semibold text-slate-700">
          <span>Sucursal</span>
          <span className="relative block">
            <select
              value={filtros.id_sucursal}
              disabled={cargandoSucursales}
              onChange={(event) => onFiltroChange('id_sucursal', event.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-11 outline-none transition hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                  {sucursal.nombre_sucursal}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </span>
        </label>
        <label className="space-y-2.5 text-sm font-semibold text-slate-700">
          <span>Fecha inicial</span>
          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={(event) => onFiltroChange('fecha_desde', event.target.value)}
            className="w-full cursor-pointer rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <label className="space-y-2.5 text-sm font-semibold text-slate-700">
          <span>Fecha final</span>
          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={(event) => onFiltroChange('fecha_hasta', event.target.value)}
            className="w-full cursor-pointer rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </label>
      </div>
      {(errorFiltros || errorSucursales) && (
        <p role="alert" className="mt-3 text-sm font-medium text-error">{errorFiltros || errorSucursales}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onRestablecer} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.98]">
          <RotateCcw className="h-4 w-4" /> Restablecer
        </button>
        <button type="submit" className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-[0.98]">
          <Search className="h-4 w-4" /> Consultar
        </button>
      </div>
    </form>
  );
}
