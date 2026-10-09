import React from 'react';
import { AlertTriangle, CalendarClock, PackagePlus } from 'lucide-react';
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

export default function ProductoVentaCard({ producto, onAgregar, busqueda }) {
  const bajoStock = producto.estado_stock === 'poco_stock';
  const proximoAVencer = producto.estado_vencimiento === 'proximo_a_vencer';
  const deshabilitado = !producto.tiene_precio;
  const esCoincidenciaAproximada = producto.tipo_coincidencia === 'aproximada';

  return (
    <button
      type="button"
      onClick={() => onAgregar(producto)}
      disabled={deshabilitado}
      aria-label={`Agregar ${producto.nombre_comercial}, lote ${producto.numero_lote}`}
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

        <span className="shrink-0 font-mono text-sm font-extrabold text-primary">
          {producto.tiene_precio
            ? formatearQuetzales(producto.precio_venta)
            : 'Sin precio'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
            bajoStock
              ? 'bg-error-container text-on-error-container'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {bajoStock ? 'Bajo stock' : 'Disponible'}: {producto.stock_disponible}
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
          {proximoAVencer ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          ) : (
            <CalendarClock className="h-3.5 w-3.5" />
          )}
          Lote {producto.numero_lote} · vence {formatearFecha(producto.fecha_vencimiento)}
        </span>
        <PackagePlus className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}
