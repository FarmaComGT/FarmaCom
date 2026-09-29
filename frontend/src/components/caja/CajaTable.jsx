import React from 'react';
import { Landmark, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';

export default function CajaTable({
  cargando,
  cajas,
  onEditar,
  onCambiarEstado,
  cambiandoEstadoId,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-surface-container-low/60">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-surface-container-low px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="col-span-4">Caja</span>
            <span className="col-span-4">Sucursal</span>
            <span className="col-span-2 text-center">Estado</span>
            <span className="col-span-2 text-center">Acciones</span>
          </div>

          {cargando ? (
            <div className="px-5 py-10 text-center font-medium text-slate-500">Cargando cajas...</div>
          ) : cajas.length === 0 ? (
            <div className="px-5 py-10 text-center font-medium text-slate-500">No hay cajas para mostrar.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {cajas.map((caja) => (
                <div key={caja.id_caja} className="grid grid-cols-12 items-center gap-4 bg-white/60 px-5 py-4">
                  <span className="col-span-4 inline-flex items-center gap-2 font-semibold text-primary">
                    <Landmark className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {caja.nombre}
                  </span>
                  <span className="col-span-4 text-sm text-slate-700">{caja.nombre_sucursal}</span>
                  <span className="col-span-2 text-center">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                      caja.activa
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {caja.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </span>
                  <div className="col-span-2 flex justify-center gap-2">
                    <button type="button" onClick={() => onEditar(caja)} aria-label={`Editar ${caja.nombre}`} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-primary/20 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onCambiarEstado(caja)}
                      disabled={cambiandoEstadoId === caja.id_caja}
                      aria-label={`${caja.activa ? 'Desactivar' : 'Activar'} ${caja.nombre}`}
                      title={caja.activa ? 'Desactivar' : 'Activar'}
                      className={`cursor-pointer rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                        caja.activa
                          ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
                          : 'text-slate-500 hover:bg-green-50 hover:text-green-700'
                      }`}
                    >
                      {caja.activa
                        ? <ToggleRight className="h-4 w-4" />
                        : <ToggleLeft className="h-4 w-4" />}
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
