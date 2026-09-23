import React from 'react';
import { NavLink } from 'react-router-dom';

export default function ReportesNav() {
  return (
    <nav aria-label="Tipos de reportes" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {[
        { ruta: '/reports', etiqueta: 'Ventas' },
        { ruta: '/reports/rentabilidad', etiqueta: 'Rentabilidad por sucursal' },
      ].map(({ ruta, etiqueta }) => (
        <NavLink key={ruta} to={ruta} end className={({ isActive }) => (
          `rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-primary/10'}`
        )}>
          {etiqueta}
        </NavLink>
      ))}
    </nav>
  );
}
