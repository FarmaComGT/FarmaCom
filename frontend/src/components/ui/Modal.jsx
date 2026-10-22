import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

const ANCHOS_MODAL = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

export function Modal({
  isOpen,
  children,
  size = 'sm',
  labelledBy,
  limitarAltura = false,
  panelClassName = '',
}) {
  if (!isOpen || typeof document === 'undefined') return null;

  const ancho = ANCHOS_MODAL[size] || ANCHOS_MODAL.sm;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`my-auto w-full ${ancho} rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          limitarAltura ? 'flex max-h-[92vh] flex-col overflow-hidden' : ''
        } ${panelClassName}`}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  title,
  titleId,
  subtitle,
  icon,
  onClose,
  disabled = false,
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 id={titleId} className="font-headline text-lg font-extrabold text-primary">
            {title}
          </h3>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}

export function ModalActions({ children, divided = false }) {
  return (
    <div className={`flex justify-end gap-3 pt-2 ${divided ? 'border-t border-slate-100' : ''}`}>
      {children}
    </div>
  );
}
