import React from 'react';
import PacienteTableHeader from './PacienteTableHeader.jsx';
import PacienteTableRow from './PacienteTableRow.jsx';

export default function PacienteTable({ cargando, pacientes, onEditar, onAnular }) {
  return (
    <section className="bg-surface-container-low/60 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <PacienteTableHeader />

          {cargando ? (
            <div className="px-5 py-10 text-center text-slate-500 font-medium">Cargando pacientes...</div>
          ) : pacientes.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 font-medium">
              No hay pacientes para mostrar.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {pacientes.map((paciente) => (
                <PacienteTableRow
                  key={paciente.id_paciente}
                  paciente={paciente}
                  onEditar={onEditar}
                  onAnular={onAnular}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
