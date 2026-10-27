import React from 'react';
import { Link } from 'react-router-dom';
import PacienteEstadoBadge from './PacienteEstadoBadge.jsx';
import PacienteAccionesMenu from './PacienteAccionesMenu.jsx';

const ETIQUETAS_SEXO = { M: 'M', F: 'F', Otro: 'Otro' };

const formatearFecha = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-GT') : '—');

export default function PacienteTableRow({ paciente, onEditar, onAnular }) {
  return (
    <div className="grid grid-cols-12 gap-4 px-5 py-4 items-center bg-white/60">
      <Link
        to={`/laboratorio/pacientes/${paciente.id_paciente}`}
        className="col-span-2 font-semibold text-primary truncate hover:underline"
      >
        {paciente.nombre_paciente}
      </Link>
      <span className="col-span-2 text-slate-700 truncate text-sm">{paciente.dpi || '—'}</span>
      <span className="col-span-1 text-slate-700 text-sm">{paciente.edad ?? '—'}</span>
      <span className="col-span-1 text-slate-700 text-sm">{ETIQUETAS_SEXO[paciente.sexo] || paciente.sexo}</span>
      <span className="col-span-2 text-slate-700 truncate text-sm">{paciente.telefono || '—'}</span>
      <span className="col-span-2 text-slate-700 text-sm">{formatearFecha(paciente.fecha_registro)}</span>
      <span className="col-span-1">
        <PacienteEstadoBadge estado={paciente.estado} />
      </span>
      <div className="col-span-1 flex justify-end">
        <PacienteAccionesMenu paciente={paciente} onEditar={onEditar} onAnular={onAnular} />
      </div>
    </div>
  );
}
