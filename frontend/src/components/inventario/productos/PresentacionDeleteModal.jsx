import React from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function PresentacionDeleteModal({
  isOpen, presentacion, productosAsociados = 0, eliminando, error, onClose, onConfirm,
}) {
  if (!presentacion) return null;
  const estaEnUso = productosAsociados > 0;
  const tituloId = 'titulo-eliminar-presentacion';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={eliminando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{estaEnUso ? 'No se puede eliminar' : 'Confirmar eliminación'}</h2>
            <p>{estaEnUso ? 'La presentación todavía está en uso.' : 'Esta acción no se puede deshacer.'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={eliminando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className={styles.form}>
          {estaEnUso ? (
            <p>La presentación <strong>{presentacion.nombre}</strong> se usa en {productosAsociados} {productosAsociados === 1 ? 'producto' : 'productos'} y no se puede eliminar.</p>
          ) : (
            <p>¿Deseas eliminar la presentación <strong>{presentacion.nombre}</strong>?</p>
          )}
          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={eliminando} className={styles.button}>{estaEnUso ? 'Entendido' : 'Cancelar'}</button>
            {!estaEnUso && <button type="button" onClick={onConfirm} disabled={eliminando} className={`${styles.button} ${styles.dangerPrimary}`}>{eliminando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}Sí, eliminar</button>}
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
