import React from 'react';
import { AlertTriangle, CalendarDays, Layers3, PackageCheck } from 'lucide-react';
import { Modal, ModalHeader } from '../ui/Modal';
import { formatearQuetzales } from '../../utils/pos';

const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha de vencimiento';
  return `Vence ${new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(fecha))}`;
};

export default function SeleccionLoteModal({ producto, onClose, onSeleccionar }) {
  const lotes = producto?.lotes || [];

  return (
    <Modal
      isOpen={Boolean(producto)}
      size="lg"
      labelledBy="titulo-seleccion-lote"
      limitarAltura
    >
      <ModalHeader
        title="Seleccionar lote"
        titleId="titulo-seleccion-lote"
        subtitle={producto?.nombre_comercial}
        icon={<Layers3 className="h-5 w-5" />}
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <p className="mb-4 text-sm font-medium text-slate-500">
          Elige manualmente el lote que deseas agregar al carrito.
        </p>

        <div className="space-y-3">
          {lotes.map((lote) => {
            const proximoAVencer = lote.estado_vencimiento === 'proximo_a_vencer';
            const promocion = Number(producto?.promocion?.precio_promocion)
              < Number(lote.precio_venta)
              ? producto.promocion
              : null;

            return (
              <button
                key={lote.id_lote}
                type="button"
                onClick={() => onSeleccionar(lote)}
                disabled={!lote.tiene_precio}
                aria-label={`Seleccionar lote ${lote.numero_lote}`}
                className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-headline font-extrabold text-on-surface group-hover:text-primary">
                      <PackageCheck className="h-4 w-4 shrink-0" />
                      Lote {lote.numero_lote}
                    </p>
                    <p className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${
                      proximoAVencer ? 'text-amber-700' : 'text-slate-500'
                    }`}>
                      {proximoAVencer
                        ? <AlertTriangle className="h-3.5 w-3.5" />
                        : <CalendarDays className="h-3.5 w-3.5" />}
                      {formatearFecha(lote.fecha_vencimiento)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-extrabold text-primary">
                      {lote.tiene_precio ? formatearQuetzales(lote.precio_venta) : 'Sin precio'}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {lote.stock_disponible} unidades
                    </p>
                  </div>
                </div>

                {promocion && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    Promoción desde {promocion.cantidad_minima} unidades:{' '}
                    {formatearQuetzales(promocion.precio_promocion)} por unidad
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4 text-right">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
