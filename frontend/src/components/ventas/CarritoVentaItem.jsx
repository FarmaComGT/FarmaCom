import React, { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatearQuetzales } from '../../utils/pos';

export default function CarritoVentaItem({
  item,
  onIncrementar,
  onDisminuir,
  onActualizarCantidad,
  onEliminar,
}) {
  const [cantidadTexto, setCantidadTexto] = useState(String(item.cantidad));

  useEffect(() => {
    setCantidadTexto(String(item.cantidad));
  }, [item.cantidad]);

  const confirmarCantidad = () => {
    if (cantidadTexto.trim() === '') {
      setCantidadTexto(String(item.cantidad));
      return;
    }

    onActualizarCantidad(item, cantidadTexto);
  };

  const cantidadNumerica = Number(cantidadTexto);
  const excedeStock = cantidadTexto.trim() !== ''
    && Number.isFinite(cantidadNumerica)
    && cantidadNumerica > item.stock_disponible;

  return (
    <div className="grid grid-cols-12 items-center gap-3 border-b border-slate-100 py-4 last:border-0">
      <div className="col-span-12 min-w-0 sm:col-span-5 sm:pr-4">
        <p className="truncate font-headline text-sm font-extrabold text-on-surface">
          {item.nombre_comercial}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
          {item.presentacion} · lote {item.numero_lote}
        </p>
      </div>

      <div className="col-span-5 flex flex-col items-center sm:col-span-3">
        <div className="flex items-center rounded-lg bg-surface-container-highest/60 p-1">
          <button
            type="button"
            onClick={() => onDisminuir(item)}
            aria-label={`Disminuir ${item.nombre_comercial}`}
            className="flex h-7 w-7 items-center justify-center rounded text-primary transition-colors hover:bg-white"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={cantidadTexto}
            onChange={(evento) => {
              if (/^\d*$/.test(evento.target.value)) {
                setCantidadTexto(evento.target.value);
              }
            }}
            onBlur={confirmarCantidad}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') evento.currentTarget.blur();
            }}
            onFocus={(evento) => evento.currentTarget.select()}
            aria-label={`Cantidad de ${item.nombre_comercial}`}
            aria-invalid={excedeStock}
            className={`h-7 w-10 bg-transparent p-0 text-center text-sm font-extrabold leading-7 outline-none focus:rounded focus:bg-white focus:ring-2 ${
              excedeStock ? 'text-error focus:ring-error/30' : 'focus:ring-primary/20'
            }`}
          />
          <button
            type="button"
            onClick={() => onIncrementar(item)}
            aria-label={`Aumentar ${item.nombre_comercial}`}
            className="flex h-7 w-7 items-center justify-center rounded text-primary transition-colors hover:bg-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {excedeStock && (
          <p role="alert" className="mt-1 text-center text-[10px] font-bold leading-tight text-error">
            Máx. {item.stock_disponible}
          </p>
        )}
      </div>

      <div className="col-span-5 text-right sm:col-span-3">
        <p className="font-mono text-xs text-slate-500">
          {formatearQuetzales(item.precioUnitario)}
        </p>
        <p className="font-mono text-sm font-extrabold text-primary">
          {formatearQuetzales(item.precioUnitario * item.cantidad)}
        </p>
      </div>

      <div className="col-span-2 flex justify-end sm:col-span-1 sm:translate-x-2">
        <button
          type="button"
          onClick={() => onEliminar(item)}
          aria-label={`Eliminar ${item.nombre_comercial}`}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-error-container/40 hover:text-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
