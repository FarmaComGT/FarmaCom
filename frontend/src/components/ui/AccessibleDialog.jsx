import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './AccessibleDialog.module.css';

const SELECTOR_CONTROLES = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const dialogStack = [];

export default function AccessibleDialog({
  open,
  labelledBy,
  describedBy,
  onClose,
  busy = false,
  size = 'medium',
  className = '',
  initialFocusRef,
  children,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  onCloseRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;

    const dialogId = Symbol('dialog');
    dialogStack.push(dialogId);
    const previousFocus = document.activeElement;
    const appRoot = document.getElementById('root');
    const previousInert = appRoot?.inert;
    const previousOverflow = document.body.style.overflow;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = 'hidden';

    const getControls = () => [...(panelRef.current?.querySelectorAll(SELECTOR_CONTROLES) || [])];
    const initialFocus = initialFocusRef?.current
      || panelRef.current?.querySelector('[aria-invalid="true"]')
      || panelRef.current?.querySelector('input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')
      || getControls()[0]
      || panelRef.current;
    initialFocus?.focus();

    const handleKeyDown = (event) => {
      if (dialogStack.at(-1) !== dialogId) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const controls = getControls();
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        panelRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      const posicion = dialogStack.lastIndexOf(dialogId);
      if (posicion >= 0) dialogStack.splice(posicion, 1);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.backdrop}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-busy={busy}
        tabIndex={-1}
        className={`${styles.dialog} ${styles[size] || styles.medium} ${className}`.trim()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
