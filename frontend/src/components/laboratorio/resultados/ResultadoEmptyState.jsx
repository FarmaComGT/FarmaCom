import React from 'react';
import { FilePlus2 } from 'lucide-react';
import styles from '../../../styles/LaboratoryUI.module.css';

export default function ResultadoEmptyState() {
  return (
    <div className={styles.emptyState}>
      <FilePlus2 size={26} aria-hidden="true" />
      <strong>Todavía no hay resultados</strong>
      <p>Utiliza “Nuevo resultado” para adjuntar el primer PDF al expediente.</p>
    </div>
  );
}
