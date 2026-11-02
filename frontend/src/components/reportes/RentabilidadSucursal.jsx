import React from 'react';
import { Banknote, ReceiptText, TrendingUp, Percent } from 'lucide-react';
import ContentState from '../ui/ContentState.jsx';
import { formatearMoneda, formatearMargen, resumirRentabilidad } from '../../utils/reportes';
import styles from '../../styles/ReportsUI.module.css';

const METRICAS = [
  { clave: 'ingresos', etiqueta: 'Ingresos', icono: Banknote, formatear: formatearMoneda },
  { clave: 'costo', etiqueta: 'Costos', icono: ReceiptText, formatear: formatearMoneda },
  { clave: 'utilidad', etiqueta: 'Utilidad', icono: TrendingUp, formatear: formatearMoneda },
  { clave: 'margen', etiqueta: 'Margen', icono: Percent, formatear: formatearMargen },
];

export default function RentabilidadSucursal({ datos = [], cargando, error, onReintentar, idSucursal = '', nombreSucursal }) {
  const todasLasSucursales = idSucursal === '' || idSucursal == null;
  const datosVisibles = todasLasSucursales
    ? datos
    : datos.filter((sucursal) => String(sucursal.id_sucursal) === String(idSucursal));
  const totales = resumirRentabilidad(datosVisibles);
  const titulo = todasLasSucursales
    ? 'Rentabilidad de todas las sucursales'
    : `Rentabilidad de ${nombreSucursal || datosVisibles[0]?.nombre_sucursal || 'la sucursal seleccionada'}`;

  return (
    <section aria-labelledby="titulo-rentabilidad" className={styles.section} aria-busy={cargando}>
      <h2 id="titulo-rentabilidad" className={styles.sectionTitle}>
        {titulo}
      </h2>
      <p className={styles.sectionDescription}>
        Utilidad sobre el costo de los productos vendidos. Margen calculado sobre los ingresos del período seleccionado.
      </p>

      {cargando ? (
        <ContentState variant="loading" message="Cargando rentabilidad por sucursal…" compact />
      ) : error ? (
        <ContentState variant="error" message={error} onRetry={onReintentar} />
      ) : datosVisibles.length === 0 ? (
        <ContentState message="No hay datos de rentabilidad para los filtros seleccionados." />
      ) : (
        <>
          <div className={styles.metricGrid}>
            {METRICAS.map(({ clave, etiqueta, icono: Icono, formatear }) => (
              <article key={clave} aria-label={`${etiqueta} de rentabilidad`} className={styles.metric}>
                <span className={styles.metricIcon}>
                  <Icono className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className={`${styles.metricValue} ${totales[clave] < 0 ? `${styles.metricNegative} text-error` : 'text-primary'}`}>
                  {formatear(totales[clave])}
                </p>
                <h3 className={styles.metricLabel}>{etiqueta}</h3>
              </article>
            ))}
          </div>
          {todasLasSucursales && <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="sr-only">Comparativa de rentabilidad por sucursal</caption>
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-2 text-left">Sucursal</th>
                  {METRICAS.map(({ clave, etiqueta }) => <th key={clave} scope="col" className={styles.numeric}>{etiqueta}</th>)}
                </tr>
              </thead>
              <tbody>
                {datos.map((sucursal) => (
                  <tr key={sucursal.id_sucursal} className="bg-slate-50 text-sm">
                    <th scope="row" className="rounded-l-xl px-3 py-3 text-left font-bold text-on-surface">{sucursal.nombre_sucursal}</th>
                    {METRICAS.map(({ clave, formatear }) => (
                      <td key={clave} className={`${styles.numeric} font-semibold tabular-nums last:rounded-r-xl ${sucursal[clave] < 0 ? 'text-error' : 'text-primary'}`}>
                        {formatear(sucursal[clave])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </>
      )}
    </section>
  );
}
