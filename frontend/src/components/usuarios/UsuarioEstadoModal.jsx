import React from 'react';
import { LoaderCircle, UserCheck, UserX, X } from 'lucide-react';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import styles from '../../styles/ManagementUI.module.css';

export default function UsuarioEstadoModal({ isOpen, usuario, cambiando, onClose, onConfirm }) {
  if (!usuario) return null;

  const esActivo = usuario.estado_usuario === 'activo';
  const accion = esActivo ? 'desactivar' : 'activar';
  const Icon = esActivo ? UserX : UserCheck;
  const tituloId = 'usuario-estado-title';
  const descripcionId = 'usuario-estado-description';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} describedBy={descripcionId} onClose={onClose} busy={cambiando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{accion} usuario</h2>
            <p>{esActivo ? 'Se revocará temporalmente su acceso.' : 'Se restaurará su acceso al sistema.'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={cambiando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <p id={descripcionId}>
          ¿Deseas <strong>{accion}</strong> a <strong>{usuario.nombre_usuario}</strong>?
        </p>

        <div className={styles.dialogActions}>
          <button type="button" onClick={onClose} disabled={cambiando} className={styles.button}>Cancelar</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cambiando}
            className={`${styles.button} ${esActivo ? styles.dangerPrimary : styles.primary}`}
          >
            {cambiando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}
            Sí, {accion}
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
