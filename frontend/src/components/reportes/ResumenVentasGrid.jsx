import React from 'react';
import {
  Banknote,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from 'lucide-react';
import { formatearMoneda, formatearNumero } from '../../utils/reportes';
import styles from '../../styles/ReportsUI.module.css';

const METRICAS = [
  {
    clave: 'ingresos_totales',
    etiqueta: 'Ingresos totales',
    icono: Banknote,
    formatear: formatearMoneda,
  },
  {
    clave: 'total_ventas',
    etiqueta: 'Ventas',
    icono: ReceiptText,
    formatear: formatearNumero,
  },
  {
    clave: 'ticket_promedio',
    etiqueta: 'Ticket promedio',
    icono: WalletCards,
    formatear: formatearMoneda,
  },
  {
    clave: 'unidades_vendidas',
    etiqueta: 'Unidades vendidas',
    icono: PackageCheck,
    formatear: formatearNumero,
  },
];

function MetricaSkeleton({ etiqueta }) {
  return (
    <div
      aria-label={`Cargando ${etiqueta.toLowerCase()}`}
      className={`${styles.metric} ${styles.skeleton}`}
    >
      <span className={styles.metricIcon} aria-hidden="true" />
    </div>
  );
}

export default function ResumenVentasGrid({ datos, cargando, error, onReintentar }) {
  if (error) {
    return (
      <div role="alert" className={`${styles.state} ${styles.stateError}`}>
        <p>{error}</p>
        <button
          type="button"
          onClick={onReintentar}
          className={styles.button}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-resumen-ventas" className={styles.section}>
      <h2 id="titulo-resumen-ventas" className={styles.sectionTitle}>
        Resumen
      </h2>
      <div className={styles.metricGrid}>
        {METRICAS.map(({ clave, etiqueta, icono: Icono, formatear }) => (
          cargando ? (
            <MetricaSkeleton key={clave} etiqueta={etiqueta} />
          ) : (
            <article
              key={clave}
              className={styles.metric}
            >
              <div className={styles.metricIcon}>
                <Icono className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className={styles.metricValue}>
                {formatear(datos?.[clave])}
              </p>
              <h3 className={styles.metricLabel}>
                {etiqueta}
              </h3>
            </article>
          )
        ))}
      </div>
    </section>
  );
}
