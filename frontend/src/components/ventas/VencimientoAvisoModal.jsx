import React from 'react';
import { Modal } from '../ui/Modal';
import styles from '../../styles/ManagementUI.module.css';
import './PuntoVentaModales.css';
import { AlertTriangle, Loader2, X } from 'lucide-react';

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(fecha));
};

export default function VencimientoAvisoModal({
  isOpen,
  productos,
  titulo,
  mensaje,
  procesando = false,
  onClose,
  onConfirm,
}) {
  if (!isOpen || typeof document === 'undefined') return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} busy={procesando} labelledBy="titulo-aviso-vencimiento" describedBy="mensaje-aviso-vencimiento" limitarAltura panelClassName={`pos-form-dialog ${styles.dialogContent}`}>
      <header className={styles.dialogHeader}>
        <h2 id="titulo-aviso-vencimiento">{titulo}</h2>
        <button type="button" onClick={onClose} disabled={procesando} aria-label="Cerrar" className={`${styles.button} ${styles.iconButton}`}><X size={18} aria-hidden="true" /></button>
      </header>
      <p id="mensaje-aviso-vencimiento">{mensaje}</p>
      <ul className="pos-expiry-list">
        {productos.map((producto, indice) => (
          <li key={producto.clave || producto.carritoKey || indice}>
            <strong>{producto.nombre_comercial}</strong>
            <span><AlertTriangle size={15} aria-hidden="true" />Lote {producto.numero_lote} · vence {formatearFecha(producto.fecha_vencimiento)}</span>
          </li>
        ))}
      </ul>
      <footer className={styles.dialogActions}>
        <button type="button" onClick={onClose} disabled={procesando} className={styles.button}>Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={procesando} className={`${styles.button} ${styles.primary}`}>
          {procesando && <Loader2 size={16} className="pos-modal-spinner" aria-hidden="true" />}Sí, continuar
        </button>
      </footer>
    </Modal>
  );
}
