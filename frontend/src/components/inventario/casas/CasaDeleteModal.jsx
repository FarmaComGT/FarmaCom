import React from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function CasaDeleteModal({ isOpen, casa, eliminando, error, onClose, onConfirm }) {
  if (!casa) return null;
  const tituloId = 'titulo-eliminar-casa';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={eliminando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>Eliminar o desactivar</h2>
            <p>El historial de inventario siempre se conservará.</p>
          </div>
          <button type="button" onClick={onClose} disabled={eliminando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.form}>
          <p>Se intentará eliminar <strong>{casa.nombre}</strong>.</p>
          <p className={styles.warning}>Si ya tiene productos o inventario, la casa se conservará y quedará inactiva.</p>
          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={eliminando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={onConfirm} disabled={eliminando} className={`${styles.button} ${styles.dangerPrimary}`}>
              {eliminando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              Continuar
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
