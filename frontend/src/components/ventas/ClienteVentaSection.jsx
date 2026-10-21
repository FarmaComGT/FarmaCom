import React from 'react';
import { UserPlus } from 'lucide-react';
import ClienteSelectorPOS from './ClienteSelectorPOS';

export default function ClienteVentaSection({ clientes, cargando, seleccionado, onSeleccionar, onNuevo }) {
  return <div className="border-b border-slate-200/70 px-5 py-4 sm:px-6"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><ClienteSelectorPOS clientes={clientes} cargando={cargando} clienteSeleccionado={seleccionado} onSeleccionar={onSeleccionar} /></div><button type="button" onClick={onNuevo} aria-label="Agregar cliente" title="Agregar cliente" className="inline-flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-container"><UserPlus className="h-4 w-4" /><span className="hidden sm:inline">Nuevo</span></button></div></div>;
}
