import React, { useEffect, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function PacienteAnularModal({ isOpen, paciente, anulando, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('');
  const tituloId = 'paciente-anular-title';
  const descripcionId = 'paciente-anular-description';

  useEffect(() => {
    if (isOpen) setMotivo('');
  }, [isOpen]);

  if (!paciente) return null;

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} describedBy={descripcionId} onClose={onClose} busy={anulando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div><h2 id={tituloId}>Anular paciente</h2><p>El expediente se conservará para auditoría.</p></div>
          <button type="button" onClick={onClose} disabled={anulando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className={styles.form}>
          <p id={descripcionId}>¿Deseas anular a <strong>{paciente.nombre_paciente}</strong>? Esta acción no se puede deshacer.</p>
          <div className={styles.field}>
            <label htmlFor="motivo_anulacion" className="campo-requerido">Motivo</label>
            <textarea aria-required="true" id="motivo_anulacion" name="motivo_anulacion" value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={500} rows={3} placeholder="Explica el motivo de la anulación…" className={styles.input} />
          </div>
          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={anulando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={() => motivo.trim() && onConfirm(motivo.trim())} disabled={anulando || !motivo.trim()} className={`${styles.button} ${styles.dangerPrimary}`}>
              {anulando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />} Sí, anular
            </button>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
