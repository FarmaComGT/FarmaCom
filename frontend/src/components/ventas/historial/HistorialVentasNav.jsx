import React from 'react';
import { NavLink } from 'react-router-dom';

const pestanas = [
  { ruta: '/ventas/historial', etiqueta: 'Ventas', fin: true },
  { ruta: '/ventas/historial/productos', etiqueta: 'Resumen por producto', fin: false },
];

export default function HistorialVentasNav() {
  return (
    <nav aria-label="Vistas del historial de ventas" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {pestanas.map(({ ruta, etiqueta, fin }) => (
        <NavLink
          key={ruta}
          to={ruta}
          end={fin}
          className={({ isActive }) => `rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-primary/10'}`}
        >
          {etiqueta}
        </NavLink>
      ))}
    </nav>
  );
}
