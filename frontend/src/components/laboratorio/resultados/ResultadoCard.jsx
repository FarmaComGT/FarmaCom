import React, { useState } from 'react';
import { Ban, Eye, Folder, MoreVertical } from 'lucide-react';
import { construirUrlPublica } from '../../../api/resultadosLaboratorio';

const formatearFecha = (fecha) => new Date(fecha).toLocaleDateString('es-GT');

export default function ResultadoCard({ resultado, onAnular }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const anulado = resultado.estado === 'anulado';

  const verDescargar = () => {
    window.open(construirUrlPublica(resultado.token_publico), '_blank', 'noopener');
  };

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={verDescargar}
        disabled={anulado}
        aria-label={`Ver o descargar resultado de ${resultado.categoria}`}
        className="flex w-full flex-col items-start gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Folder className="h-10 w-10 fill-primary/10 text-primary" />
        <div>
          <p className="max-w-[160px] truncate text-sm font-semibold text-on-surface">{resultado.categoria}</p>
          <p className="text-xs text-slate-500">{formatearFecha(resultado.fecha_subida)}</p>
        </div>
      </button>

      <span
        className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          anulado
            ? 'bg-slate-200 text-slate-600'
            : resultado.vigente
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
        }`}
      >
        {anulado ? 'Anulado' : resultado.vigente ? 'Vigente' : 'Expirado'}
      </span>

      {!anulado && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            aria-label={`Más acciones para ${resultado.categoria}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuAbierto && (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  verDescargar();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" /> Ver / Descargar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  onAnular(resultado);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Ban className="h-3.5 w-3.5" /> Anular / Reemplazar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
