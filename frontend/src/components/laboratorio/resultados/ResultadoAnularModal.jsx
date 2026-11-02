import React, { useEffect, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function ResultadoAnularModal({ isOpen, resultado, anulando, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('');
  const tituloId = 'resultado-anular-title';
  const descripcionId = 'resultado-anular-description';
  useEffect(() => { if (isOpen) setMotivo(''); }, [isOpen]);
  if (!resultado) return null;

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} describedBy={descripcionId} onClose={onClose} busy={anulando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div><h2 id={tituloId}>Anular resultado</h2><p>El enlace público dejará de funcionar.</p></div>
          <button type="button" onClick={onClose} disabled={anulando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className={styles.form}>
          <p id={descripcionId}>¿Deseas anular el resultado de <strong>{resultado.categoria}</strong>? Esta acción no se puede deshacer.</p>
          <div className={styles.field}>
            <label htmlFor="motivo_anulacion_resultado">Motivo</label>
            <textarea id="motivo_anulacion_resultado" value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={500} rows={3} placeholder="Ej.: Se adjuntó el archivo incorrecto…" className={styles.input} />
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
