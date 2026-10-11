import React from 'react';
import { Banknote, CreditCard } from 'lucide-react';

const METODOS = [
  { id: 'efectivo', etiqueta: 'Efectivo', icono: Banknote },
  { id: 'tarjeta', etiqueta: 'Tarjeta', icono: CreditCard },
];

export default function MetodoPagoSelector({ seleccionado, onSeleccionar }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {METODOS.map(({ id, etiqueta, icono: Icono }) => {
        const activo = seleccionado === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSeleccionar(id)}
            aria-pressed={activo}
            className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center shadow-sm transition-all ${
              activo
                ? 'border-primary bg-primary text-white shadow-primary/15'
                : 'border-slate-200 bg-white text-on-surface hover:border-primary/30 hover:bg-primary/5'
            }`}
          >
            <Icono className="h-5 w-5" />
            <span className="text-xs font-extrabold sm:text-sm">{etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}
