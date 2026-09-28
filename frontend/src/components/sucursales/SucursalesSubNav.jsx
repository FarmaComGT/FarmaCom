import React from 'react';
import { NavLink } from 'react-router-dom';
import { FlaskConical, MapPin, Store } from 'lucide-react';
import { motion } from 'motion/react';

const tabs = [
  { label: 'Sucursales', path: '/sucursales', icon: Store },
  { label: 'Laboratorios', path: '/laboratorios', icon: FlaskConical },
  { label: 'Ciudades', path: '/ciudades', icon: MapPin },
];

export default function SucursalesSubNav() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex w-fit items-center gap-1 rounded-2xl border border-slate-200 bg-surface-container-low p-1.5"
    >
      {tabs.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl px-5 py-2.5 font-headline text-sm font-bold transition-all duration-200 ${
              isActive
                ? 'border border-primary/10 bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:bg-white/60 hover:text-primary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </motion.div>
  );
}
