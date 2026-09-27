import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function ResultadoEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-surface-container-low/60 p-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FolderOpen className="w-6 h-6" />
      </span>
      <p className="font-headline text-sm font-bold text-slate-600">Todavía no hay resultados</p>
      <p className="max-w-xs text-xs text-slate-500">
        Sube el primer resultado de laboratorio de este paciente con el botón &quot;Nuevo resultado&quot;.
      </p>
    </div>
  );
}
