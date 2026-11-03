import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import ReportesNav from '../components/reportes/ReportesNav.jsx';
import ContentState from '../components/ui/ContentState.jsx';
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
          <ContentState variant="loading" message="Cargando reporte…" compact className={styles.skeleton} />
        )}>
          <Outlet />
        </Suspense>
      </div>
    </section>
  );
}
