import React from 'react';

const ESTADOS = {
  stock: {
    sin_lotes: ['Sin lotes', 'border-slate-200 bg-slate-100 text-slate-600'],
    agotado: ['Agotado', 'border-red-200 bg-red-50 text-red-700'],
    poco_stock: ['Poco stock', 'border-amber-200 bg-amber-50 text-amber-700'],
    normal: ['Disponible', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  },
  vencimiento: {
    sin_lotes: ['No aplica', 'border-slate-200 bg-slate-100 text-slate-500'],
    vencido: ['Vencido', 'border-red-200 bg-red-50 text-red-700'],
    proximo_a_vencer: ['Próximo a vencer', 'border-orange-200 bg-orange-50 text-orange-700'],
    normal: ['Sin alertas', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  },
};

export default function EstadoInventarioBadge({ tipo, estado }) {
  const [etiqueta, clases] = ESTADOS[tipo]?.[estado] ?? ['Sin información', 'border-slate-200 bg-slate-100 text-slate-500'];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${clases}`}>
      {etiqueta}
    </span>
  );
}
