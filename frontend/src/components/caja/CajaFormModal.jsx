import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function CajaFormModal({
  abierta,
  editando,
  formulario,
  sucursales,
  cargandoSucursales,
  guardando,
  error,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!abierta || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-formulario-caja"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="titulo-formulario-caja" className="font-headline text-lg font-extrabold text-primary">
            {editando ? 'Editar caja' : 'Nueva caja'}
          </h2>
          <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar" className="cursor-pointer text-slate-500 hover:text-slate-700 disabled:opacity-60">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1">
            <label htmlFor="caja-sucursal" className="text-sm font-semibold text-slate-700">Sucursal</label>
            <div className="relative">
              <select
                id="caja-sucursal"
                name="id_sucursal"
                value={formulario.id_sucursal}
                onChange={onChange}
                disabled={editando || cargandoSucursales}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                required
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                    {sucursal.nombre_sucursal}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="caja-nombre" className="text-sm font-semibold text-slate-700">Nombre de la caja</label>
            <input
              id="caja-nombre"
              name="nombre"
              value={formulario.nombre}
              onChange={onChange}
              maxLength={100}
              placeholder="Ej: Caja principal"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={guardando} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              Cancelar
            </button>
            <button type="submit" disabled={guardando || cargandoSucursales} className="cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear caja'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
