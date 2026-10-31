import React from 'react';
import { Info, X } from 'lucide-react';

export default function AvisoPuntoVenta({ mensaje, onCerrar }) {
  if (!mensaje) return null;
  return (
    <div className="pos-aviso" role="status">
      <span className="pos-aviso-text">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        {mensaje}
      </span>
      <button type="button" onClick={onCerrar} aria-label="Cerrar aviso">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
