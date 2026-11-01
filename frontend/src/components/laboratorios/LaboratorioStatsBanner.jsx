import React from 'react';
import styles from '../../styles/ManagementUI.module.css';

export default function LaboratorioStatsBanner({ totalFiltrados, totalLaboratorios }) {
  return (
    <div className={styles.summary} aria-label="Resumen de laboratorios">
      <div className={styles.stat}><strong>{totalLaboratorios}</strong><span>Laboratorios registrados</span></div>
      <div className={styles.stat}><strong>{totalFiltrados}</strong><span>Resultados visibles</span></div>
    </div>
  );
}
