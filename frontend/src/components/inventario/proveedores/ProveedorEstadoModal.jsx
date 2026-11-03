import React from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProveedorEstadoModal({ isOpen, proveedor, procesando, error, onClose, onConfirm }) {
  if (!proveedor) return null;
  const seDesactiva = Boolean(proveedor.activo);
  const tituloId = 'titulo-cambiar-estado-proveedor';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={procesando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{seDesactiva ? 'Desactivar proveedor' : 'Activar proveedor'}</h2>
            <p>{seDesactiva ? 'Sus datos e historial se conservarán.' : 'Volverá a estar disponible para nuevas operaciones.'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={procesando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className={styles.form}>
          <p>¿Deseas {seDesactiva ? 'desactivar' : 'activar'} <strong>{proveedor.nombre}</strong>?</p>
          {seDesactiva && <p className={styles.warning}>No podrá asignarse a nuevas compras mientras permanezca inactivo.</p>}
          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={procesando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={onConfirm} disabled={procesando} className={`${styles.button} ${seDesactiva ? styles.dangerPrimary : styles.primary}`}>
              {procesando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {seDesactiva ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
