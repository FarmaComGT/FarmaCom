import React from 'react';
import { Package, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

const TARJETAS = [
  {
    key: 'total',
    campo: 'total_productos',
    label: 'Total Productos',
    sublabel: 'Registrados en el catálogo',
    icono: Package,
    colorBorde: 'border-primary',
    colorIcono: 'text-primary',
    colorFondoIcono: 'bg-primary/10 group-hover:bg-primary group-hover:text-white',
    badgeLabel: 'Global',
    badgeClase: 'text-on-surface-variant',
  },
  {
    key: 'criticos',
    campo: 'productos_criticos',
    label: 'Vencidos / Agotados',
    sublabel: 'Requieren atención inmediata',
    icono: AlertTriangle,
    colorBorde: 'border-error',
    colorIcono: 'text-error',
    colorFondoIcono: 'bg-error/10 group-hover:bg-error group-hover:text-white',
    badgeLabel: 'Crítico',
    badgeClase: 'text-error',
  },
  {
    key: 'proximos',
    campo: 'productos_proximos_vencer',
    label: 'Próximos a Vencer',
    sublabel: 'Dentro del rango de alerta',
    icono: Clock,
    colorBorde: 'border-amber-500',
    colorIcono: 'text-amber-600',
    colorFondoIcono: 'bg-amber-50 group-hover:bg-amber-500 group-hover:text-white',
    badgeLabel: 'Alerta',
    badgeClase: 'text-amber-600',
  },
  {
    key: 'optimos',
    campo: 'productos_optimos',
    label: 'Estado Óptimo',
    sublabel: 'Stock y vencimiento normales',
    icono: CheckCircle,
    colorBorde: 'border-secondary',
    colorIcono: 'text-secondary',
    colorFondoIcono: 'bg-secondary/10 group-hover:bg-secondary group-hover:text-white',
    badgeLabel: 'En buen estado',
    badgeClase: 'text-secondary',
  },
];

export default function InventarioStatsCards({ resumen, filtroActivo, onFiltroChange, cargando }) {
  const handleClick = (key) => {
    onFiltroChange(filtroActivo === key ? null : key);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {TARJETAS.map(({ key, campo, label, sublabel, icono: Icono, colorBorde, colorIcono, colorFondoIcono, badgeLabel, badgeClase }, idx) => {
        const valor = cargando ? '—' : (resumen?.[campo] ?? 0);
        const isActive = filtroActivo === key;
        const muestraEstadoFiltro = isActive && key !== 'total';

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, duration: 0.3 }}
            onClick={() => handleClick(key)}
            className={`
              bg-surface-container-lowest p-6 rounded-2xl shadow-sm
              border-b-4 ${colorBorde}
              transition-all duration-200 cursor-pointer group
              hover:-translate-y-1
              ${muestraEstadoFiltro
                ? 'ring-2 ring-offset-1 ring-primary/30 bg-primary-fixed/20'
                : 'hover:shadow-md'
              }
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg transition-colors duration-200 ${colorIcono} ${colorFondoIcono}`}>
                <Icono className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${badgeClase}`}>
                {badgeLabel}
              </span>
            </div>

            <p className="text-3xl font-black text-on-surface tracking-tight leading-none mb-1">
              {valor}
            </p>
            <p className="text-sm font-semibold text-on-surface">{label}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{sublabel}</p>

            {muestraEstadoFiltro && (
              <div className="mt-3 pt-3 border-t border-primary/10">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Filtro activo — click para limpiar
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
