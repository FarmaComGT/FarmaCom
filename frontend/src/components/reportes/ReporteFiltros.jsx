import React, { useRef } from 'react';
import { CalendarDays, ChevronDown, Filter, RotateCcw } from 'lucide-react';

const claseCampo = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-on-surface outline-none transition-all hover:border-primary/30 hover:shadow-sm focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none';

const abrirSelectorFecha = (referencia) => {
  if (typeof referencia.current?.showPicker !== 'function') return;

  try {
    referencia.current.showPicker();
  } catch {
    // El navegador puede bloquear showPicker fuera de una interacción directa.
  }
};

export default function ReporteFiltros({
  filtros,
  mostrarAgrupacion = true,
  sucursales,
  cargandoSucursales,
  errorSucursales,
  errorFiltros,
  onFiltroChange,
  onAplicar,
  onRestablecer,
}) {
  const campoDesdeRef = useRef(null);
  const campoHastaRef = useRef(null);

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    onAplicar();
  };

  return (
    <form
      aria-label="Filtros de reportes"
      onSubmit={manejarEnvio}
      className="rounded-2xl bg-surface-container-low p-4"
    >
      <div className={`grid gap-4 sm:grid-cols-2 xl:items-end ${mostrarAgrupacion
        ? 'xl:grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,0.8fr)_auto]'
        : 'xl:grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]'}`}>
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-on-surface-variant">Sucursal</span>
          <div className="relative">
            <select
              value={filtros.id_sucursal}
              onChange={(evento) => onFiltroChange('id_sucursal', evento.target.value)}
              disabled={cargandoSucursales}
              className={`${claseCampo} cursor-pointer appearance-none pr-10`}
            >
              <option value="">
                {cargandoSucursales ? 'Cargando sucursales…' : 'Todas las sucursales'}
              </option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                  {sucursal.nombre_sucursal}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black"
            />
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-bold text-on-surface-variant">Desde</span>
          <div className="relative">
            <input
              ref={campoDesdeRef}
              type="date"
              value={filtros.fecha_desde}
              onChange={(evento) => onFiltroChange('fecha_desde', evento.target.value)}
              className={`${claseCampo} cursor-text pr-10 [&::-webkit-calendar-picker-indicator]:hidden`}
            />
            <button
              type="button"
              onClick={() => abrirSelectorFecha(campoDesdeRef)}
              aria-label="Abrir calendario de fecha inicial"
              className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-black transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-bold text-on-surface-variant">Hasta</span>
          <div className="relative">
            <input
              ref={campoHastaRef}
              type="date"
              value={filtros.fecha_hasta}
              onChange={(evento) => onFiltroChange('fecha_hasta', evento.target.value)}
              className={`${claseCampo} cursor-text pr-10 [&::-webkit-calendar-picker-indicator]:hidden`}
            />
            <button
              type="button"
              onClick={() => abrirSelectorFecha(campoHastaRef)}
              aria-label="Abrir calendario de fecha final"
              className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-black transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </label>

        {mostrarAgrupacion && (
        <label className="space-y-1.5">
          <span className="text-xs font-bold text-on-surface-variant">Agrupar por</span>
          <div className="relative">
            <select
              value={filtros.agrupacion}
              onChange={(evento) => onFiltroChange('agrupacion', evento.target.value)}
              className={`${claseCampo} cursor-pointer appearance-none pr-10`}
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black"
            />
          </div>
        </label>
        )}

        <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-headline text-sm font-bold text-white shadow-sm transition hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 xl:flex-none"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Aplicar
          </button>
          <button
            type="button"
            onClick={onRestablecer}
            aria-label="Restablecer filtros"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-primary/20 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {(errorFiltros || errorSucursales) && (
        <p role="alert" className="mt-3 text-sm font-medium text-error">
          {errorFiltros || errorSucursales}
        </p>
      )}
    </form>
  );
}
