import React from 'react';
import { Banknote, ReceiptText, TrendingUp, Percent, RefreshCw } from 'lucide-react';
import { formatearMoneda, formatearMargen, resumirRentabilidad } from '../../utils/reportes';

const METRICAS = [
  { clave: 'ingresos', etiqueta: 'Ingresos', icono: Banknote, formatear: formatearMoneda },
  { clave: 'costo', etiqueta: 'Costos', icono: ReceiptText, formatear: formatearMoneda },
  { clave: 'utilidad', etiqueta: 'Utilidad', icono: TrendingUp, formatear: formatearMoneda },
  { clave: 'margen', etiqueta: 'Margen', icono: Percent, formatear: formatearMargen },
];

export default function RentabilidadSucursal({ datos = [], cargando, error, onReintentar, idSucursal = '', nombreSucursal }) {
  const todasLasSucursales = idSucursal === '' || idSucursal == null;
  const datosVisibles = todasLasSucursales
    ? datos
    : datos.filter((sucursal) => String(sucursal.id_sucursal) === String(idSucursal));
  const totales = resumirRentabilidad(datosVisibles);
  const titulo = todasLasSucursales
    ? 'Rentabilidad de todas las sucursales'
    : `Rentabilidad de ${nombreSucursal || datosVisibles[0]?.nombre_sucursal || 'la sucursal seleccionada'}`;

  return (
    <section aria-labelledby="titulo-rentabilidad" className="space-y-3" aria-busy={cargando}>
      <h2 id="titulo-rentabilidad" className="font-headline text-lg font-extrabold text-on-surface">
        {titulo}
      </h2>
      <p className="text-sm text-slate-500">
        Utilidad sobre el costo de los productos vendidos. Margen calculado sobre los ingresos del período seleccionado.
      </p>

      {cargando ? (
        <div role="status" className="animate-pulse rounded-2xl bg-slate-100 p-8 text-sm text-slate-500">
          Cargando rentabilidad por sucursal…
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-error-container/30 p-5">
          <p className="text-sm font-semibold text-on-error-container">{error}</p>
          <button type="button" onClick={onReintentar} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-error shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/20">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />Reintentar
          </button>
        </div>
      ) : datosVisibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No hay datos de rentabilidad para los filtros seleccionados.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {METRICAS.map(({ clave, etiqueta, icono: Icono, formatear }) => (
              <article key={clave} aria-label={`${etiqueta} de rentabilidad`} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icono className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className={`mt-4 font-headline text-2xl font-extrabold ${totales[clave] < 0 ? 'text-error' : 'text-primary'}`}>
                  {formatear(totales[clave])}
                </p>
                <h3 className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{etiqueta}</h3>
              </article>
            ))}
          </div>
          {todasLasSucursales && <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-2">
              <caption className="sr-only">Comparativa de rentabilidad por sucursal</caption>
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-2 text-left">Sucursal</th>
                  {METRICAS.map(({ clave, etiqueta }) => <th key={clave} scope="col" className="px-3 py-2 text-right">{etiqueta}</th>)}
                </tr>
              </thead>
              <tbody>
                {datos.map((sucursal) => (
                  <tr key={sucursal.id_sucursal} className="bg-slate-50 text-sm">
                    <th scope="row" className="rounded-l-xl px-3 py-3 text-left font-bold text-on-surface">{sucursal.nombre_sucursal}</th>
                    {METRICAS.map(({ clave, formatear }) => (
                      <td key={clave} className={`px-3 py-3 text-right font-semibold tabular-nums last:rounded-r-xl ${sucursal[clave] < 0 ? 'text-error' : 'text-primary'}`}>
                        {formatear(sucursal[clave])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </>
      )}
    </section>
  );
}
