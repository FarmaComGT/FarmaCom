import React from 'react';
import { Banknote, CreditCard } from 'lucide-react';

const METODOS = [
  { id: 'efectivo', etiqueta: 'Efectivo', icono: Banknote },
  { id: 'tarjeta', etiqueta: 'Tarjeta', icono: CreditCard },
];

export default function MetodoPagoSelector({ seleccionado, onSeleccionar }) {
  return (
    <fieldset className="pos-pago">
      <legend className="sr-only">Método de pago</legend>
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
    </fieldset>
  );
}
