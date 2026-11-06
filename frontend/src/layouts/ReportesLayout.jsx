import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ReportesNav from '../components/reportes/ReportesNav.jsx';
import ContentState from '../components/ui/ContentState.jsx';
import styles from '../styles/ReportsUI.module.css';

export default function ReportesLayout() {
  const esResumen = useLocation().pathname === '/reports/resumen-diario';
  return (
    <section aria-labelledby="titulo-reportes" className={styles.page}>
      <header className={styles.header}>
        <h1 id="titulo-reportes">{esResumen ? 'Envío de resumen' : 'Reportes'}</h1>
        <p>{esResumen ? 'Configura tu resumen de ventas por correo, incluso cuando las cajas siguen abiertas.'
          : 'Consulta el rendimiento comercial y la rentabilidad por sucursal.'}</p>
      </header>
      {!esResumen && <ReportesNav />}
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
