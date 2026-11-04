import { useToast } from '../../context/ToastContext.jsx';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertCircle, UserPlus, X } from 'lucide-react';
import { esNitValido, MENSAJE_NIT_INVALIDO, normalizarNit } from '../../utils/nit';

const formularioInicial = {
  nombre_cliente: '',
  nit: '',
  observaciones: '',
};

export default function NuevoClienteModal({
  isOpen,
  onClose,
  onCrear,
}) {
  const toast = useToast();
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormulario(formularioInicial);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const manejarCambio = (evento) => {
    setFormulario((actual) => ({
      ...actual,
      [evento.target.name]: evento.target.value,
    }));
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    const nombreCliente = formulario.nombre_cliente.trim();

    if (!nombreCliente) {
      setError('El nombre del cliente es requerido.');
      return;
    }

    if (!esNitValido(formulario.nit)) {
      setError(MENSAJE_NIT_INVALIDO);
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      await onCrear({
        nombre_cliente: nombreCliente,
        nit: normalizarNit(formulario.nit) || null,
        observaciones: formulario.observaciones.trim() || null,
      });
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo agregar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-nuevo-cliente"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h3
                id="titulo-nuevo-cliente"
                className="font-headline text-lg font-extrabold text-primary"
              >
                Nuevo cliente
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Se seleccionará automáticamente en la venta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4 px-6 py-5">
          <div>
            <label
              htmlFor="nombre-cliente-pos"
              className="text-sm font-semibold text-slate-700"
            >
              Nombre completo
            </label>
            <input
              id="nombre-cliente-pos"
              name="nombre_cliente"
              value={formulario.nombre_cliente}
              onChange={manejarCambio}
              required
              maxLength={150}
              autoComplete="name"
              autoFocus
              placeholder="Ej. María López"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="nit-cliente-pos"
              className="text-sm font-semibold text-slate-700"
            >
              NIT <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="nit-cliente-pos"
              name="nit"
              value={formulario.nit}
              onChange={manejarCambio}
              maxLength={20}
              autoCapitalize="characters"
              placeholder="Ej. 1234567-K"
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="observaciones-cliente-pos"
              className="text-sm font-semibold text-slate-700"
            >
              Observaciones <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="observaciones-cliente-pos"
              name="observaciones"
              value={formulario.observaciones}
              onChange={manejarCambio}
              maxLength={2000}
              rows={3}
              placeholder="Información útil para futuras compras"
              className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <div className="flex gap-2 rounded-xl border border-error/20 bg-error-container/40 px-4 py-3 text-sm font-semibold text-on-error-container">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {guardando ? 'Agregando...' : 'Agregar y seleccionar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
