import React, { useState } from 'react';
import { Ban, MoreVertical, Pencil, Trash2 } from 'lucide-react';

export default function PacienteAccionesMenu({ paciente, onEditar, onAnular, onEliminar }) {
  const [abierto, setAbierto] = useState(false);
  const anulado = paciente.estado === 'anulado';

  const cerrar = () => setAbierto(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-label={`Más acciones para ${paciente.nombre_paciente}`}
        aria-haspopup="true"
        aria-expanded={abierto}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {abierto && (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            disabled={anulado}
            onClick={() => {
              cerrar();
              onEditar(paciente);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          {!anulado && (
            <button
              type="button"
              onClick={() => {
                cerrar();
                onAnular(paciente);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Ban className="h-3.5 w-3.5" /> Anular
            </button>
          )}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              cerrar();
              onEliminar(paciente);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
