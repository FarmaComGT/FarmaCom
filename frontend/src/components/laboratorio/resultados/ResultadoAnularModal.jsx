import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Ban, X } from 'lucide-react';

export default function ResultadoAnularModal({ isOpen, resultado, anulando, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (isOpen) setMotivo('');
  }, [isOpen]);

  if (!isOpen || !resultado || typeof document === 'undefined') {
    return null;
  }

  const manejarConfirmar = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo.trim());
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Ban className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-headline font-extrabold text-primary">Anular resultado</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={anulando}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            ¿Estás seguro que deseas anular el resultado de{' '}
            <span className="font-bold text-primary">{resultado.categoria}</span>? El código QR dejará de
            funcionar y no se puede deshacer.
          </p>

          <div className="space-y-1">
            <label htmlFor="motivo_anulacion_resultado" className="text-sm font-semibold text-slate-700">
              Motivo <span className="text-error">*</span>
            </label>
            <textarea
              id="motivo_anulacion_resultado"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ej. Se subió el archivo incorrecto"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={anulando}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={manejarConfirmar}
              disabled={anulando || !motivo.trim()}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {anulando ? 'Anulando...' : 'Sí, anular'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
