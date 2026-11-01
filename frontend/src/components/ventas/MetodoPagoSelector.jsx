import React from 'react';
import { Banknote, CreditCard } from 'lucide-react';

const METODOS = [
  { id: 'efectivo', etiqueta: 'Efectivo', icono: Banknote },
  { id: 'tarjeta', etiqueta: 'Tarjeta', icono: CreditCard },
];

export default function MetodoPagoSelector({ seleccionado, onSeleccionar }) {
  return (
    <div className="pos-pago">
      {METODOS.map(({ id, etiqueta, icono: Icono }) => {
        const activo = seleccionado === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSeleccionar(id)}
            aria-pressed={activo}
            className="pos-pago-opt"
          >
            <Icono aria-hidden="true" />
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}
