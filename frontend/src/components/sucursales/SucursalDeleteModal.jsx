import React from 'react';
import { LoaderCircle, Trash2, X } from 'lucide-react';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import styles from '../../styles/ManagementUI.module.css';

export default function SucursalDeleteModal({ isOpen, sucursal, eliminando, onClose, onConfirm }) {
  if (!sucursal) return null;
  const tituloId = 'sucursal-delete-title';
  const descripcionId = 'sucursal-delete-description';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} describedBy={descripcionId} onClose={onClose} busy={eliminando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>Confirmar eliminación</h2>
            <p>Esta acción puede afectar información asociada.</p>
          </div>
          <button type="button" onClick={onClose} disabled={eliminando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <p id={descripcionId}>¿Deseas eliminar la sucursal <strong>{sucursal.nombre_sucursal}</strong>?</p>

        <div className={styles.dialogActions}>
          <button type="button" onClick={onClose} disabled={eliminando} className={styles.button}>Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={eliminando} className={`${styles.button} ${styles.dangerPrimary}`}>
            {eliminando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
            Sí, eliminar
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
