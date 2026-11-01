import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ui from './CajaUI.module.css';
import styles from './CajaDialog.module.css';

export default function CajaDialog({ abierta, labelledBy, onClose, ocupada = false, children }) {
  const panel = useRef(null);
  const cerrar = useRef(onClose);
  const bloqueada = useRef(ocupada);
  cerrar.current = onClose;
  bloqueada.current = ocupada;
  useEffect(() => {
    if (!abierta) return undefined;
    const anterior = document.activeElement;
    const raiz = document.getElementById('root');
    const inertAnterior = raiz?.inert;
    if (raiz) raiz.inert = true;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controles = () => [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      .sort((primero, segundo) => primero.compareDocumentPosition(segundo) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const inicial = panel.current.querySelector('[aria-invalid="true"]:not(:disabled)')
      || panel.current.querySelector('input:not(:disabled), textarea:not(:disabled)')
      || panel.current.querySelector('select:not(:disabled)')
      || controles()[0]
      || panel.current;
    inicial.focus();
    const manejarTecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        if (!bloqueada.current) cerrar.current();
      }
      if (evento.key !== 'Tab') return;
      const elementos = controles(); const primero = elementos[0]; const ultimo = elementos.at(-1);
      if (!primero) { evento.preventDefault(); panel.current.focus(); }
      else if (evento.shiftKey && (document.activeElement === primero || document.activeElement === panel.current)) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && (document.activeElement === ultimo || document.activeElement === panel.current)) { evento.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', manejarTecla);
    return () => {
      if (raiz) raiz.inert = inertAnterior;
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', manejarTecla);
      if (anterior?.isConnected) anterior.focus();
    };
  }, [abierta]);
  if (!abierta || typeof document === 'undefined') return null;
  return createPortal(<div className={`${ui.theme} ${styles.backdrop}`}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-busy={ocupada} tabIndex={-1} className={styles.dialog}>{children}</div>
  </div>, document.body);
}
