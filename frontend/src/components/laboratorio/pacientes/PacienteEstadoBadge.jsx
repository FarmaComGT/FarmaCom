import React from 'react';

const ESTILOS_ESTADO = {
  activo: 'bg-green-100 text-green-700 border border-green-200',
  anulado: 'bg-red-100 text-red-700 border border-red-200',
};

const ETIQUETAS_ESTADO = {
  activo: 'Activo',
  anulado: 'Anulado',
};

export default function PacienteEstadoBadge({ estado }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        ESTILOS_ESTADO[estado] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {ETIQUETAS_ESTADO[estado] || estado}
    </span>
  );
}
