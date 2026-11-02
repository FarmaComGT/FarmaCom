import React from 'react';
import { X } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog.jsx';
import styles from './Modal.module.css';

const ANCHOS_MODAL = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

export function Modal({
  isOpen,
  children,
  size = 'sm',
  labelledBy,
  describedBy,
  onClose,
  busy = false,
  limitarAltura = false,
  panelClassName = '',
}) {
  const ancho = ANCHOS_MODAL[size] || ANCHOS_MODAL.sm;

  return (
    <AccessibleDialog
      open={isOpen}
      labelledBy={labelledBy}
      describedBy={describedBy}
      onClose={onClose}
      busy={busy}
      size={ancho}
      className={`${styles.panel} ${limitarAltura ? styles.limited : ''} ${panelClassName}`}
    >
      {children}
    </AccessibleDialog>
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
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}

export function ModalActions({ children, divided = false }) {
  return (
    <footer className={`flex justify-end gap-3 pt-2 ${divided ? 'border-t border-slate-100' : ''}`}>
      {children}
    </footer>
  );
}
