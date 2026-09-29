import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { motion } from 'motion/react';

const ROLES = [
  { value: 'dueno', label: 'Dueño' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'dependiente', label: 'Dependiente' },
  { value: 'laboratorista', label: 'Laboratorista' },
];

export default function UsuarioFormModal({
  isOpen,
  modoEdicion,
  formulario,
  sucursales,
  cargandoSucursales,
  laboratorios = [],
  cargandoLaboratorios,
  guardando,
  errorFormulario,
  onClose,
  onSubmit,
  onChange,
}) {
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-headline font-extrabold text-primary">
            {modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Nombre</label>
            <input
              type="text"
              name="nombre_usuario"
              value={formulario.nombre_usuario}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Ej: Juan García"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Correo electrónico</label>
            <input
              type="email"
              name="correo_usuario"
              value={formulario.correo_usuario}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Ej: juan@farmacom.com"
              required
            />
          </div>

          {!modoEdicion && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Contraseña</label>
              <input
                type="password"
                name="contrasena"
                value={formulario.contrasena}
                onChange={onChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="rol" className="text-sm font-semibold text-slate-700">Rol</label>
            <div className="relative">
              <select
                name="rol"
                id="rol"
                value={formulario.rol}
                onChange={onChange}
                className="w-full appearance-none rounded-xl border border-slate-300 px-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                required
              >
                <option value="">Selecciona un rol</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="id_sucursal" className="text-sm font-semibold text-slate-700">Sucursal</label>
            <div className="relative">
              <select
                name="id_sucursal"
                id="id_sucursal"
                value={formulario.id_sucursal}
                onChange={onChange}
                className="w-full appearance-none rounded-xl border border-slate-300 px-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                disabled={cargandoSucursales}
                required
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre_sucursal}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            {!cargandoSucursales && sucursales.length === 0 && (
              <p className="text-xs text-error font-medium">No hay sucursales registradas.</p>
            )}
          </div>

          {formulario.rol === 'laboratorista' && (
            <div className="space-y-1">
              <label htmlFor="id_laboratorio" className="text-sm font-semibold text-slate-700">
                Laboratorio
              </label>
              <div className="relative">
                <select
                  name="id_laboratorio"
                  id="id_laboratorio"
                  value={formulario.id_laboratorio}
                  onChange={onChange}
                  className="w-full appearance-none rounded-xl border border-slate-300 px-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  disabled={cargandoLaboratorios}
                  required
                >
                  <option value="">Selecciona un laboratorio</option>
                  {laboratorios.map((laboratorio) => (
                    <option key={laboratorio.id_laboratorio} value={laboratorio.id_laboratorio}>
                      {laboratorio.nombre_laboratorio}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {!cargandoLaboratorios && laboratorios.length === 0 && (
                <p className="text-xs text-error font-medium">No hay laboratorios activos registrados.</p>
              )}
            </div>
          )}

          {errorFormulario && (
            <p className="text-sm text-error font-semibold">{errorFormulario}</p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || cargandoSucursales || sucursales.length === 0 || (
                formulario.rol === 'laboratorista' && (cargandoLaboratorios || laboratorios.length === 0)
              )}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
