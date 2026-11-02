import React from 'react';
import styles from '../../styles/ManagementUI.module.css';

export default function SucursalStatsBanner({ totalFiltradas, totalSucursales }) {
  return (
    <div className={styles.summary} aria-label="Resumen de sucursales">
      <div className={styles.stat}><strong>{totalSucursales}</strong><span>Sucursales registradas</span></div>
      <div className={styles.stat}><strong>{totalFiltradas}</strong><span>Resultados visibles</span></div>
    </div>
  );
}
