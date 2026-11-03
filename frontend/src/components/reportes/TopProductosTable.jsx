import React from 'react';
import { PackageSearch } from 'lucide-react';
import ContentState from '../ui/ContentState.jsx';
import { formatearMoneda, formatearNumero } from '../../utils/reportes';
import styles from '../../styles/ReportsUI.module.css';

export default function TopProductosTable({
  datos = [],
  criterio,
  cargando,
  error,
  onCriterioChange,
  onReintentar,
}) {
  return (
    <section
      aria-labelledby="titulo-top-productos"
      className={styles.panel}
    >
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <PackageSearch className="h-5 w-5" aria-hidden="true" />
          <h2 id="titulo-top-productos">
            Productos más vendidos
          </h2>
        </div>

        <div
          role="group"
          aria-label="Criterio del ranking"
          className={styles.segmented}
        >
          {[
            { valor: 'cantidad', etiqueta: 'Cantidad' },
            { valor: 'ingresos', etiqueta: 'Ingresos' },
          ].map((opcion) => {
            const estaActivo = criterio === opcion.valor;
            return (
              <button
                key={opcion.valor}
                type="button"
                aria-pressed={estaActivo}
                disabled={cargando && datos.length === 0}
                onClick={() => {
                  if (!estaActivo) onCriterioChange(opcion.valor);
                }}
                className={styles.segment}
              >
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={styles.rankingContent}
        aria-busy={cargando}
        aria-live="polite"
      >
      {cargando && datos.length === 0 && (
        <div role="status" aria-label="Cargando productos más vendidos" className="mt-5 space-y-3">
          {[1, 2, 3, 4, 5].map((fila) => (
            <div key={fila} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {cargando && datos.length > 0 && (
        <div className={styles.rankingProgress} role="status">
          <span className="sr-only">Actualizando ranking…</span>
          <span aria-hidden="true" />
        </div>
      )}

      {!cargando && error && (
        <ContentState variant="error" message={error} onRetry={onReintentar} />
      )}

      {!cargando && !error && datos.length === 0 && (
        <ContentState message="No hay productos vendidos en el período seleccionado." />
      )}

      {!error && datos.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">
              Ranking de productos ordenado por {criterio === 'ingresos' ? 'ingresos' : 'cantidad vendida'}
            </caption>
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <th className="px-3 pb-1">Posición</th>
                <th className="px-3 pb-1">Producto</th>
                <th className={styles.numeric}>Cantidad</th>
                <th className={styles.numeric}>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((producto, indice) => (
                  <tr key={producto.id_producto} className="bg-slate-50/80">
                    <td className="rounded-l-xl px-3 py-3">
                      <span className={`${styles.rank} text-primary`}>
                        {indice + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className={styles.productName}>
                        {producto.nombre_comercial}
                      </p>
                      <div className={styles.productMeta}>
                        {producto.codigo && <span>{producto.codigo}</span>}
                        {producto.codigo && producto.nombre_generico && <span aria-hidden="true">·</span>}
                        {producto.nombre_generico && <span>{producto.nombre_generico}</span>}
                      </div>
                    </td>
                    <td className={`${styles.numeric} text-primary`}>
                      {formatearNumero(producto.cantidad_vendida)}
                    </td>
                    <td className={`${styles.numeric} text-primary`}>
                      {formatearMoneda(producto.ingresos_generados)}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </section>
  );
}
