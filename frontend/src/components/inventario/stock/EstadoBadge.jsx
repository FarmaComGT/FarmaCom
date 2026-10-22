import React from 'react';

const ESTADOS = {
  sin_lotes: {
    label: 'Sin lotes',
    clase: 'border-slate-200 bg-slate-100 text-slate-600',
    punto: 'bg-slate-400',
  },
  vencido: {
    label: 'Vencido',
    clase: 'bg-error-container text-on-error-container border-error/20',
    punto: 'bg-error',
  },
  agotado: {
    label: 'Agotado',
    clase: 'bg-error-container/60 text-on-error-container border-error/10',
    punto: 'bg-error/70',
  },
  proximo_a_vencer: {
    label: 'Próx. Vencer',
    clase: 'bg-tertiary-container/20 text-tertiary border-tertiary/20',
    punto: 'bg-tertiary',
  },
  poco_stock: {
    label: 'Poco Stock',
    clase: 'bg-amber-50 text-amber-700 border-amber-200',
    punto: 'bg-amber-500',
  },
  normal: {
    label: 'En buen estado',
    clase: 'bg-secondary-container text-on-secondary-container border-secondary/10',
    punto: 'bg-primary animate-pulse',
  },
};

export default function EstadoBadge({ estado }) {
  const cfg = ESTADOS[estado] ?? ESTADOS.normal;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${cfg.clase}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.punto}`} />
      {cfg.label}
    </span>
  );
}
