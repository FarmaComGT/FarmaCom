import React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { motion } from 'motion/react';

export default function LaboratorioActionBar({ busqueda, onBusquedaChange, onCrear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-surface-container-low p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center"
    >
      <div className="relative flex-1 group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
        <input
          type="search"
          aria-label="Buscar laboratorios"
          placeholder="Buscar por nombre, ciudad o dirección..."
          value={busqueda}
          onChange={onBusquedaChange}
          className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border-none rounded-xl text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
      </div>
      <button
        type="button"
        onClick={onCrear}
        className="px-6 py-3 bg-linear-to-br from-primary to-primary-container text-white font-headline font-bold text-sm rounded-xl shadow-[0_4px_12px_rgba(0,81,71,0.25)] hover:shadow-[0_6px_20px_rgba(0,81,71,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
      >
        <PlusCircle className="w-4 h-4" />
        Nuevo laboratorio
      </button>
    </motion.div>
  );
}
