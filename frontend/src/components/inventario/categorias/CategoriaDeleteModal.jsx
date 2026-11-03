import React from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function CategoriaDeleteModal({ isOpen, categoria, eliminando, error, onClose, onConfirm }) {
  if (!categoria) return null;
  const tituloId = 'titulo-eliminar-categoria';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={eliminando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>Eliminar categoría</h2>
            <p>Esta acción no se puede deshacer.</p>
          </div>
          <button type="button" onClick={onClose} disabled={eliminando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.form}>
          <p>¿Deseas eliminar la categoría <strong>{categoria.nombre}</strong>?</p>
          <p className={styles.warning}>Solo podrá eliminarse si no está vinculada a productos.</p>
          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={eliminando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={onConfirm} disabled={eliminando} className={`${styles.button} ${styles.dangerPrimary}`}>
              {eliminando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              Eliminar categoría
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
