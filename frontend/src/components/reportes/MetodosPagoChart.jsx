import React from 'react';
import { CreditCard } from 'lucide-react';
import ContentState from '../ui/ContentState.jsx';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts';
import { formatearMoneda, formatearNumero } from '../../utils/reportes';
import styles from '../../styles/ReportsUI.module.css';

const COLORES_METODO = {
  efectivo: '#006b5f',
  tarjeta: '#f59e0b',
};

const COLORES_ADICIONALES = ['#0284c7', '#7c3aed', '#e11d48'];

const obtenerColorMetodo = (metodo, indice) => (
  COLORES_METODO[metodo] || COLORES_ADICIONALES[indice % COLORES_ADICIONALES.length]
);

const formatearMetodo = (metodo = '') => (
  metodo
    .replaceAll('_', ' ')
    .replace(/^./, (letra) => letra.toUpperCase())
);

export default function MetodosPagoChart({ datos, cargando, error, onReintentar }) {
  const datosPreparados = datos?.map((metodo, indice) => ({
    ...metodo,
    color: obtenerColorMetodo(metodo.metodo_pago, indice),
  })) ?? [];
  const datosDisponibles = datosPreparados.filter((metodo) => metodo.ingresos > 0);
  const totalIngresos = datosDisponibles.reduce(
    (total, metodo) => total + metodo.ingresos,
    0,
  );

  return (
    <section
      aria-labelledby="titulo-metodos-pago"
      className={styles.panel}
    >
      <div className={styles.panelTitle}>
        <CreditCard className="h-5 w-5" aria-hidden="true" />
        <h2 id="titulo-metodos-pago">
          Métodos de pago
        </h2>
      </div>

      {cargando && (
        <div role="status" aria-label="Cargando métodos de pago" className="mt-5 h-80 animate-pulse rounded-xl bg-slate-100" />
      )}

      {!cargando && error && (
        <ContentState variant="error" message={error} onRetry={onReintentar} />
      )}

      {!cargando && !error && datosDisponibles.length === 0 && (
        <ContentState message="No hay pagos en el período seleccionado." />
      )}

      {!cargando && !error && datosDisponibles.length > 0 && (
        <figure aria-label="Distribución de ingresos por método de pago" className="mt-4">
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosDisponibles}
                  dataKey="ingresos"
                  nameKey="metodo_pago"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {datosDisponibles.map((metodo) => (
                    <Cell
                      key={metodo.metodo_pago}
                      fill={metodo.color}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

          </div>

          <figcaption className={styles.paymentTotal}>
            <span>Total</span>
            <strong>{formatearMoneda(totalIngresos)}</strong>
          </figcaption>

          <ul className="mt-2 space-y-2.5">
            {datosPreparados.map((metodo) => (
              <li
                key={metodo.metodo_pago}
                className={styles.paymentRow}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: metodo.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {formatearMetodo(metodo.metodo_pago)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatearNumero(metodo.total_ventas)} ventas
                    </p>
                  </div>
                </div>
                <div className={styles.paymentAmount}>
                  <p className="text-sm font-extrabold text-primary">
                    {metodo.porcentaje_ingresos}%
                  </p>
                  <p className="text-xs text-slate-500">{formatearMoneda(metodo.ingresos)}</p>
                </div>
              </li>
            ))}
          </ul>
        </figure>
      )}
    </section>
  );
}
