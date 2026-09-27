import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

const ESTADO_INICIAL = {
  nombre_paciente: '',
  dpi: '',
  sexo: '',
  modoEdad: 'fecha',
  fecha_nacimiento: '',
  edad_manual: '',
  telefono: '',
  direccion: '',
  observaciones: '',
};

const OPCIONES_SEXO = [
  { valor: 'M', etiqueta: 'Masculino' },
  { valor: 'F', etiqueta: 'Femenino' },
  { valor: 'Otro', etiqueta: 'Otro' },
];

export default function PacienteFormModal({
  isOpen,
  modoEdicion,
  paciente,
  guardando,
  errorFormulario,
  onClose,
  onSubmit,
}) {
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);
  const [errorLocal, setErrorLocal] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorLocal(null);

    if (modoEdicion && paciente) {
      setFormulario({
        nombre_paciente: paciente.nombre_paciente || '',
        dpi: paciente.dpi || '',
        sexo: paciente.sexo || '',
        modoEdad: paciente.fecha_nacimiento ? 'fecha' : 'manual',
        fecha_nacimiento: paciente.fecha_nacimiento ? paciente.fecha_nacimiento.slice(0, 10) : '',
        edad_manual: paciente.edad_manual != null ? String(paciente.edad_manual) : '',
        telefono: paciente.telefono || '',
        direccion: paciente.direccion || '',
        observaciones: paciente.observaciones || '',
      });
    } else {
      setFormulario(ESTADO_INICIAL);
    }
  }, [isOpen, modoEdicion, paciente]);

  if (!isOpen || typeof document === 'undefined') return null;

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const seleccionarSexo = (valor) => {
    setFormulario((prev) => ({ ...prev, sexo: valor }));
  };

  const seleccionarModoEdad = (modo) => {
    setFormulario((prev) => ({ ...prev, modoEdad: modo }));
  };

  const manejarEnvio = (e) => {
    e.preventDefault();

    if (!formulario.sexo) {
      setErrorLocal('Selecciona el sexo del paciente.');
      return;
    }
    if (formulario.modoEdad === 'fecha' && !formulario.fecha_nacimiento) {
      setErrorLocal('Ingresa la fecha de nacimiento.');
      return;
    }
    if (formulario.modoEdad === 'manual' && formulario.edad_manual === '') {
      setErrorLocal('Ingresa la edad del paciente.');
      return;
    }

    setErrorLocal(null);

    onSubmit({
      nombre_paciente: formulario.nombre_paciente.trim(),
      dpi: formulario.dpi.trim() || null,
      sexo: formulario.sexo,
      fecha_nacimiento: formulario.modoEdad === 'fecha' ? formulario.fecha_nacimiento : null,
      edad_manual: formulario.modoEdad === 'manual' ? Number(formulario.edad_manual) : null,
      telefono: formulario.telefono.trim() || null,
      direccion: formulario.direccion.trim() || null,
      observaciones: formulario.observaciones.trim() || null,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-headline font-extrabold text-primary">
            {modoEdicion ? 'Editar paciente' : 'Nuevo paciente'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <label htmlFor="nombre_paciente" className="text-sm font-semibold text-slate-700">
              Nombre completo <span className="text-error">*</span>
            </label>
            <input
              id="nombre_paciente"
              type="text"
              name="nombre_paciente"
              value={formulario.nombre_paciente}
              onChange={manejarCambio}
              placeholder="Ej. Ana López"
              maxLength={150}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="dpi" className="text-sm font-semibold text-slate-700">
                DPI <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <input
                id="dpi"
                type="text"
                name="dpi"
                value={formulario.dpi}
                onChange={manejarCambio}
                placeholder="Número de DPI"
                maxLength={20}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="telefono" className="text-sm font-semibold text-slate-700">
                Teléfono <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <input
                id="telefono"
                type="text"
                name="telefono"
                value={formulario.telefono}
                onChange={manejarCambio}
                placeholder="Ej. 5555-1111"
                maxLength={20}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-semibold text-slate-700">
              Sexo <span className="text-error">*</span>
            </span>
            <div className="flex gap-2">
              {OPCIONES_SEXO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => seleccionarSexo(opcion.valor)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    formulario.sexo === opcion.valor
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">
                Edad <span className="text-error">*</span>
              </span>
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => seleccionarModoEdad('fecha')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    formulario.modoEdad === 'fecha' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Fecha de nacimiento
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarModoEdad('manual')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    formulario.modoEdad === 'manual' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Edad manual
                </button>
              </div>
            </div>

            {formulario.modoEdad === 'fecha' ? (
              <input
                type="date"
                name="fecha_nacimiento"
                value={formulario.fecha_nacimiento}
                onChange={manejarCambio}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            ) : (
              <input
                type="number"
                name="edad_manual"
                value={formulario.edad_manual}
                onChange={manejarCambio}
                placeholder="Ej. 45"
                min="0"
                max="120"
                step="1"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="direccion" className="text-sm font-semibold text-slate-700">
              Dirección <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <input
              id="direccion"
              type="text"
              name="direccion"
              value={formulario.direccion}
              onChange={manejarCambio}
              maxLength={500}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="observaciones" className="text-sm font-semibold text-slate-700">
              Observaciones <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formulario.observaciones}
              onChange={manejarCambio}
              maxLength={2000}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          {(errorLocal || errorFormulario) && (
            <p className="text-sm text-error font-semibold">{errorLocal || errorFormulario}</p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Guardar paciente'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
