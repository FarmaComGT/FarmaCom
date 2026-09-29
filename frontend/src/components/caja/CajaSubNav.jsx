import React from 'react';
import { History, Landmark } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const clasesPestana = ({ isActive }) => (
  `inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
    isActive
      ? 'border-primary text-primary'
      : 'border-transparent text-slate-500 hover:border-primary/30 hover:text-primary'
  }`
);

export default function CajaSubNav({ rol }) {
  const puedeVerHistorial = ['dueno', 'administrador'].includes(rol);

  return (
    <nav aria-label="Secciones de caja" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 px-2 shadow-sm">
      <div className="flex min-w-max">
        <NavLink to="/caja" end className={clasesPestana}>
          <Landmark className="h-4 w-4" aria-hidden="true" />
          Operación
        </NavLink>
        {puedeVerHistorial && (
          <NavLink to="/caja/historial" className={clasesPestana}>
            <History className="h-4 w-4" aria-hidden="true" />
            Historial
          </NavLink>
        )}
      </div>
    </nav>
  );
}
