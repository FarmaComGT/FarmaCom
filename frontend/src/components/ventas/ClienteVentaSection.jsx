import React from 'react';
import { UserPlus } from 'lucide-react';
import ClienteSelectorPOS from './ClienteSelectorPOS';

export default function ClienteVentaSection({ clientes, cargando, seleccionado, onSeleccionar, onNuevo }) {
  return (
    <div className="pos-cliente">
      <div className="min-w-0 flex-1">
        <ClienteSelectorPOS clientes={clientes} cargando={cargando} clienteSeleccionado={seleccionado} onSeleccionar={onSeleccionar} />
      </div>
      <button type="button" onClick={onNuevo} aria-label="Agregar cliente" title="Agregar cliente" className="pos-cliente-add">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Nuevo</span>
      </button>
    </div>
  );
}
