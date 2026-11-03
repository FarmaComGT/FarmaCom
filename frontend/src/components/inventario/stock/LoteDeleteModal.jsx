import React from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function LoteDeleteModal({ isOpen, lote, eliminando, error = null, onClose, onConfirm }) {
  if (!lote) return null;
  const tituloId = 'titulo-eliminar-lote';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={eliminando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>Eliminar lote</h2>
            <p>Esta acción no se puede deshacer.</p>
          </div>
          <button type="button" onClick={onClose} disabled={eliminando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.form}>
          <p>¿Deseas eliminar el lote <strong>{lote.numero_lote}</strong>?</p>
          <p className={styles.warning}>Los lotes asociados a ventas no pueden eliminarse porque forman parte del historial.</p>
          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={eliminando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={onConfirm} disabled={eliminando} className={`${styles.button} ${styles.dangerPrimary}`}>
              {eliminando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              Eliminar lote
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
