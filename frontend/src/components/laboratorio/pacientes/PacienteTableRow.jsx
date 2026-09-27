import React from 'react';
import { Link } from 'react-router-dom';
import { Ban, Pencil } from 'lucide-react';
import PacienteEstadoBadge from './PacienteEstadoBadge.jsx';

const ETIQUETAS_SEXO = { M: 'M', F: 'F', Otro: 'Otro' };

const formatearFecha = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-GT') : '—');

export default function PacienteTableRow({ paciente, onEditar, onAnular }) {
  const anulado = paciente.estado === 'anulado';

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
      <div className="col-span-1 flex justify-end gap-1">
        <button
          onClick={() => onEditar(paciente)}
          disabled={anulado}
          title="Editar"
          aria-label={`Editar ${paciente.nombre_paciente}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary border border-primary/20 hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {!anulado && (
          <button
            onClick={() => onAnular(paciente)}
            title="Anular"
            aria-label={`Anular ${paciente.nombre_paciente}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 border border-red-200 hover:bg-red-50"
          >
            <Ban className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
