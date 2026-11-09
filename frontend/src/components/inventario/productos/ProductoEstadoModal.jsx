import React, { useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProductoEstadoModal({ producto, procesando, error, onClose, onConfirm }) {
  const cancelarRef = useRef(null);
  return (
    <AccessibleDialog open={Boolean(producto)} labelledBy="producto-estado-titulo" describedBy="producto-estado-descripcion" onClose={onClose} busy={procesando} initialFocusRef={cancelarRef} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <h2 id="producto-estado-titulo">Desactivar producto</h2>
          <button type="button" onClick={onClose} disabled={procesando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className={styles.form}>
          <p>¿Deseas desactivar <strong>{producto?.nombre_comercial}</strong>?</p>
          <p id="producto-estado-descripcion">No podrá venderse ni recibir nuevos lotes. Sus lotes e historial se conservarán y podrás activarlo nuevamente.</p>
          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button ref={cancelarRef} type="button" onClick={onClose} disabled={procesando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={onConfirm} disabled={procesando} className={`${styles.button} ${styles.dangerPrimary}`}>
              {procesando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}Desactivar
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
