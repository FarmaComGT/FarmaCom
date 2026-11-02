import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import ReportesNav from '../components/reportes/ReportesNav.jsx';
import styles from '../styles/ReportsUI.module.css';

export default function ReportesLayout() {
  return (
    <section aria-labelledby="titulo-reportes" className={styles.page}>
      <header className={styles.header}>
        <h1 id="titulo-reportes">Reportes</h1>
        <p>Consulta el rendimiento comercial y la rentabilidad por sucursal.</p>
      </header>
      <ReportesNav />
      <div className={styles.content}>
        <Suspense fallback={(
          <div role="status" className={`${styles.state} ${styles.skeleton}`}>
            Cargando reporte…
          </div>
        )}>
          <Outlet />
        </Suspense>
      </div>
    </section>
  );
}
