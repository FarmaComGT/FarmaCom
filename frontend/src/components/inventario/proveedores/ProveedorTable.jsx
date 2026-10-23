import React from 'react';
import ProveedorTableHeader from './ProveedorTableHeader.jsx';
import ProveedorTableRow from './ProveedorTableRow.jsx';

export default function ProveedorTable({
  cargando,
  proveedores,
  onEditar,
  onCambiarEstado,
  onContactos,
  onEliminar,
  procesandoId,
}) {
  return (
    <section className="bg-surface-container-low/60 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <ProveedorTableHeader />
          {cargando ? (
            <div className="px-5 py-10 text-center text-slate-500 font-medium">Cargando proveedores...</div>
          ) : proveedores.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 font-medium">No hay proveedores para mostrar.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {proveedores.map((p) => (
                <ProveedorTableRow
                  key={p.id_proveedor}
                  proveedor={p}
                  onEditar={onEditar}
                  onCambiarEstado={onCambiarEstado}
                  onContactos={onContactos}
                  onEliminar={onEliminar}
                  procesando={procesandoId === p.id_proveedor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
