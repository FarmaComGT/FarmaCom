import React from 'react';

export default function PacienteTableHeader() {
  return (
    <div className="grid grid-cols-12 gap-4 px-5 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200 bg-surface-container-low">
      <span className="col-span-2">Nombre</span>
      <span className="col-span-2">DPI</span>
      <span className="col-span-1">Edad</span>
      <span className="col-span-1">Sexo</span>
      <span className="col-span-2">Teléfono</span>
      <span className="col-span-2">Registro</span>
      <span className="col-span-1">Estado</span>
      <span className="col-span-1 text-right">Acciones</span>
    </div>
  );
}
