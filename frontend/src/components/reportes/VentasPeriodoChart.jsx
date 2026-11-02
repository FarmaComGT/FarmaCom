import React from 'react';
import { BarChart3 } from 'lucide-react';
import ContentState from '../ui/ContentState.jsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatearFechaReporte,
  formatearMoneda,
  formatearNumero,
  formatearPeriodoReporte,
} from '../../utils/reportes';
import styles from '../../styles/ReportsUI.module.css';

const ETIQUETAS_AGRUPACION = {
  dia: 'Por día',
  semana: 'Por semana',
  mes: 'Por mes',
};

const formatearEjeMoneda = (valor) => {
  const monto = Number(valor) || 0;
  if (monto >= 1000000) return `Q${(monto / 1000000).toFixed(1)}M`;
  if (monto >= 1000) return `Q${(monto / 1000).toFixed(1)}K`;
  return `Q${monto}`;
};

function TooltipVentas({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const periodo = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-xs font-bold text-slate-500">{formatearFechaReporte(label)}</p>
      <p className="mt-1 font-headline text-base font-extrabold text-primary">
        {formatearMoneda(periodo.ingresos)}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">
        {formatearNumero(periodo.total_ventas)} ventas ·{' '}
        {formatearNumero(periodo.unidades_vendidas)} unidades
      </p>
    </div>
  );
}

export default function VentasPeriodoChart({
  datos,
  agrupacion,
  cargando,
  error,
  onReintentar,
}) {
  const hayVentas = datos?.some((periodo) => periodo.ingresos > 0);

  return (
    <section
      aria-labelledby="titulo-ventas-periodo"
      className={styles.panel}
    >
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
          <h2 id="titulo-ventas-periodo">
            Ingresos por período
          </h2>
        </div>
        <span className={styles.panelMeta}>
          {ETIQUETAS_AGRUPACION[agrupacion] || ETIQUETAS_AGRUPACION.dia}
        </span>
      </div>

      {cargando && (
        <div role="status" aria-label="Cargando gráfica de ingresos" className="mt-5 h-80 animate-pulse rounded-xl bg-slate-100" />
      )}

      {!cargando && error && (
        <ContentState variant="error" message={error} onRetry={onReintentar} />
      )}

      {!cargando && !error && !hayVentas && (
        <ContentState message="No hay ventas en el período seleccionado." />
      )}

      {!cargando && !error && hayVentas && (
        <figure aria-label="Gráfica de ingresos por período" className={styles.chartViewport}>
          <div
            data-testid="grafica-ingresos-contenedor"
            className={styles.chart}
            style={{ height: '320px', minWidth: `${Math.max(620, datos.length * 42)}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="periodo"
                  tickFormatter={(valor) => formatearPeriodoReporte(valor, agrupacion)}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={formatearEjeMoneda}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  width={58}
                />
                <Tooltip content={<TooltipVentas />} cursor={{ fill: '#005147', opacity: 0.05 }} />
                <Bar
                  dataKey="ingresos"
                  name="Ingresos"
                  fill="#006b5f"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="sr-only">
            <caption>Detalle de ingresos por período</caption>
            <thead>
              <tr>
                <th>Período</th>
                <th>Ingresos</th>
                <th>Ventas</th>
                <th>Unidades</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((periodo) => (
                <tr key={periodo.periodo}>
                  <td>{formatearFechaReporte(periodo.periodo)}</td>
                  <td>{formatearMoneda(periodo.ingresos)}</td>
                  <td>{formatearNumero(periodo.total_ventas)}</td>
                  <td>{formatearNumero(periodo.unidades_vendidas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </section>
  );
}
