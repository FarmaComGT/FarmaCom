import React from 'react';
import { Info, X } from 'lucide-react';

export default function AvisoPuntoVenta({ mensaje, onCerrar }) {
  if (!mensaje) return null;
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary"><span className="flex items-center gap-2"><Info className="h-4 w-4 shrink-0" />{mensaje}</span><button type="button" onClick={onCerrar} aria-label="Cerrar aviso" className="rounded-lg p-1 hover:bg-white/60"><X className="h-4 w-4" /></button></div>;
}
