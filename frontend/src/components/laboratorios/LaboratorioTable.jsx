import React from 'react';
import { MapPin, Pencil } from 'lucide-react';

export default function LaboratorioTable({ cargando, laboratorios, mapaCiudades, onEditar }) {
  return (
    <section className="bg-surface-container-low/60 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-12 gap-4 px-5 py-4 text-xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200 bg-surface-container-low">
            <span className="col-span-3">Laboratorio</span>
            <span className="col-span-3">Ciudad</span>
            <span className="col-span-4">Dirección</span>
            <span className="col-span-2 text-center">Acciones</span>
          </div>

          {cargando ? (
            <div className="px-5 py-10 text-center text-slate-500 font-medium">Cargando laboratorios...</div>
          ) : laboratorios.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 font-medium">No hay laboratorios para mostrar.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {laboratorios.map((laboratorio) => (
                <div key={laboratorio.id_laboratorio} className="grid grid-cols-12 gap-4 px-5 py-4 items-center bg-white/60">
                  <span className="col-span-3 font-semibold text-primary">{laboratorio.nombre_laboratorio}</span>
                  <span className="col-span-3 inline-flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {mapaCiudades[laboratorio.id_ciudad] || 'Sin ciudad asignada'}
                  </span>
                  <span className="col-span-4 text-slate-700 text-sm">{laboratorio.direccion}</span>
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => onEditar(laboratorio)}
                      aria-label={`Editar ${laboratorio.nombre_laboratorio}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
