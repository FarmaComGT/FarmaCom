import React from 'react';
import { NavLink } from 'react-router-dom';
import { WarehouseIcon, Tag, Truck, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

const tabs = [
  { label: 'Inventario',  path: '/inventario',            icon: WarehouseIcon },
  { label: 'Categorías',  path: '/inventario/categorias', icon: Tag },
  { label: 'Proveedores', path: '/inventario/proveedores', icon: Truck },
  { label: 'Casas',       path: '/inventario/casas',      icon: Building2 },
];

export default function InventarioSubNav() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-1 bg-surface-container-low border border-slate-200 rounded-2xl p-1.5 w-fit"
    >
      {tabs.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/inventario'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-headline font-bold transition-all duration-200 ${
              isActive
                ? 'bg-white text-primary shadow-sm border border-primary/10'
                : 'text-slate-500 hover:text-primary hover:bg-white/60'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </motion.div>
  );
}
