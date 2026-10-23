import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

export default function ProveedorDeleteModal({ isOpen, proveedor, eliminando, onClose, onConfirm }) {
  if (!isOpen || !proveedor || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-eliminar-proveedor"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h3 id="titulo-eliminar-proveedor" className="text-lg font-headline font-extrabold text-primary">Eliminar o desactivar</h3>
          </div>
          <button type="button" onClick={onClose} disabled={eliminando} className="text-slate-500 hover:text-slate-700 disabled:opacity-50" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Se eliminará permanentemente el proveedor{' '}
            <span className="font-bold text-primary">{proveedor.nombre}</span> únicamente si nunca
            se ha utilizado. Si tiene productos, lotes o inventario en alguna sucursal, se
            conservará y quedará inactivo para proteger el historial.
          </p>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={eliminando} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} disabled={eliminando} className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
              {eliminando ? 'Procesando...' : 'Continuar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
