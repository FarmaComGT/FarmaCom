import React from 'react';
import { Layers3, PackagePlus } from 'lucide-react';
import { formatearQuetzales } from '../../utils/pos';
import { obtenerPartesCoincidentes } from '../../utils/resaltarCoincidencia';

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(fecha));
};

const TextoCoincidente = ({ texto, busqueda }) => {
  const partes = obtenerPartesCoincidentes(texto, busqueda);
  if (!partes) return texto;

  return (
    <>
      {partes.antes}
      <mark className="rounded-sm bg-amber-200/80 px-0.5 text-inherit">
        {partes.coincidencia}
      </mark>
      {partes.despues}
    </>
  );
};

export default function ProductoVentaCard({ producto, onSeleccionar, busqueda }) {
  const deshabilitado = !producto.tiene_precio;
  const esCoincidenciaAproximada = producto.tipo_coincidencia === 'aproximada';
  const cantidadLotes = Number(producto.cantidad_lotes) || producto.lotes?.length || 1;
  const precioMinimo = Number(producto.precio_minimo);
  const precioMaximo = Number(producto.precio_maximo);
  const preciosDiferentes = precioMaximo > precioMinimo;
  const promocion = Number(producto.promocion?.precio_promocion) < precioMinimo
    ? producto.promocion
    : null;

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(producto)}
      disabled={deshabilitado}
      aria-label={`Seleccionar lote de ${producto.nombre_comercial}`}
      className="group w-full rounded-xl bg-white p-4 text-left shadow-[0_2px_10px_rgba(0,81,71,0.03)] transition-all hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-headline font-extrabold text-on-surface transition-colors group-hover:text-primary">
            <TextoCoincidente texto={producto.nombre_comercial} busqueda={busqueda} />
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            <TextoCoincidente texto={producto.nombre_generico} busqueda={busqueda} />
            {producto.concentracion && (
              <>
                {' · '}
                <TextoCoincidente texto={producto.concentracion} busqueda={busqueda} />
              </>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {promocion ? (
            <>
              <p className="font-mono text-xs font-semibold text-slate-400 line-through">
                {preciosDiferentes
                  ? `${formatearQuetzales(precioMinimo)} - ${formatearQuetzales(precioMaximo)}`
                  : formatearQuetzales(precioMinimo)}
              </p>
              <p className="font-mono text-sm font-extrabold text-primary">
                {formatearQuetzales(promocion.precio_promocion)}
              </p>
            </>
          ) : (
            <span className="font-mono text-sm font-extrabold text-primary">
              {producto.tiene_precio
                ? preciosDiferentes
                  ? `${formatearQuetzales(precioMinimo)} - ${formatearQuetzales(precioMaximo)}`
                  : formatearQuetzales(precioMinimo)
                : 'Sin precio'}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {promocion && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
            Promo desde {promocion.cantidad_minima} unidades · hasta {formatearFecha(promocion.fecha_fin)}
          </span>
        )}
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary">
          Existencias: {producto.stock_disponible}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
          <TextoCoincidente texto={producto.presentacion} busqueda={busqueda} />
        </span>
        {esCoincidenciaAproximada && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
            Coincidencia aproximada
          </span>
        )}
        <span className="text-[11px] font-medium text-slate-400">
          Código: <TextoCoincidente texto={producto.codigo} busqueda={busqueda} />
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <Layers3 className="h-3.5 w-3.5" />
          Selecciona el lote que deseas vender
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
          {cantidadLotes} {cantidadLotes === 1 ? 'lote disponible' : 'lotes disponibles'}
        </span>
        <PackagePlus className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}
