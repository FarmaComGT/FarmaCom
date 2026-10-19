import React, { useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EstadoBadge from './EstadoBadge.jsx';
import LotesDeProductoTable from './LotesDeProductoTable.jsx';
import { pluralizarPresentacion } from '../../../constants/presentaciones.js';

export default function InventarioProductoFila({
  producto,
  sucursalId,
  onEditarLote,
  onEliminarLote,
  lotesRefreshKey,
}) {
  const [expandido, setExpandido] = useState(false);

  const stockTotal = Number(producto.stock_total ?? 0);
  const stockCritico = producto.estado_stock
    ? ['agotado', 'poco_stock'].includes(producto.estado_stock)
    : stockTotal <= producto.stock_minimo;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpandido((v) => !v)}
        onKeyDown={(e) => e.key === 'Enter' && setExpandido((v) => !v)}
        className={`
          grid grid-cols-12 gap-4 px-6 py-4 items-center
          transition-colors duration-150 cursor-pointer group
          ${expandido
            ? 'bg-primary/5 border-l-4 border-primary'
            : 'bg-white/60 hover:bg-surface-container-low/40 border-l-4 border-transparent'
          }
        `}
      >
        <div className="col-span-1 flex items-center justify-center">
          <div className={`
            w-9 h-9 rounded-xl flex items-center justify-center transition-all
            ${expandido
              ? 'bg-primary text-white'
              : producto.estado_consolidado === 'vencido' || producto.estado_consolidado === 'agotado'
                ? 'bg-error/10 text-error group-hover:bg-error group-hover:text-white'
                : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'
            }
          `}>
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="col-span-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-bold text-on-surface truncate">{producto.nombre_comercial}</p>
            {producto.presentacion && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary">
                {producto.presentacion}
              </span>
            )}
          </div>
          {producto.nombre_generico && (
            <p className="text-xs text-on-surface-variant italic truncate">
              {producto.nombre_generico}
              {producto.concentracion ? ` · ${producto.concentracion}` : ''}
            </p>
          )}
        </div>

        <div className="col-span-2 min-w-0">
          <p className="text-sm text-slate-700 truncate">{producto.categoria_nombre ?? '—'}</p>
          <p className="text-xs text-slate-400 truncate">{producto.casa_nombre ?? '—'}</p>
        </div>

        <span className="col-span-2 text-sm text-slate-600 truncate">
          {producto.proveedor_nombre ?? (
            <span className="text-slate-300 italic">Sin asignar</span>
          )}
        </span>

        <div className="col-span-2 text-right">
          <span className={`text-lg font-black tracking-tight ${
            stockCritico ? 'text-error' : 'text-primary'
          }`}>
            {stockTotal.toLocaleString('es-GT')}
          </span>
          <p className="text-[10px] text-slate-400 font-medium">
            {pluralizarPresentacion(producto.presentacion)}
          </p>
        </div>

        <div className="col-span-1 flex justify-center">
          <EstadoBadge estado={producto.estado_consolidado} />
        </div>

        <div className="col-span-1 flex justify-center">
          <ChevronDown
            className={`w-4 h-4 text-on-surface-variant transition-transform duration-300 ${
              expandido ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      <AnimatePresence>
        {expandido && (
          <motion.div
            key="lotes-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`
              px-12 py-6 border-x-4 bg-surface-container-lowest
              ${producto.estado_consolidado === 'vencido' || producto.estado_consolidado === 'agotado'
                ? 'border-error/20'
                : 'border-primary-container/20'
              }
            `}>
              <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${
                producto.estado_consolidado === 'vencido' || producto.estado_consolidado === 'agotado'
                  ? 'text-error'
                  : 'text-primary'
              }`}>
                <Layers className="w-3.5 h-3.5" />
                Lotes del producto — {producto.nombre_comercial}
                <span className="ml-2 text-[10px] font-semibold text-slate-400 normal-case tracking-normal">
                  ({producto.total_lotes} lote{producto.total_lotes !== 1 ? 's' : ''} en esta sucursal)
                </span>
              </h4>

              <LotesDeProductoTable
                producto={producto}
                sucursalId={sucursalId}
                activo={expandido}
                onEditar={onEditarLote}
                onEliminar={onEliminarLote}
                refreshKey={lotesRefreshKey}
              />

              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { label: 'Lotes vencidos',    valor: producto.lotes_vencidos,       color: 'text-error' },
                  { label: 'Próx. vencer',      valor: producto.lotes_proximos_vencer, color: 'text-tertiary' },
                  { label: 'Poco stock',         valor: producto.lotes_poco_stock,     color: 'text-amber-600' },
                  { label: 'Agotados',           valor: producto.lotes_agotados,       color: 'text-error/70' },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="text-center bg-surface-container-low rounded-lg px-3 py-2">
                    <p className={`text-xl font-black ${color}`}>{valor ?? 0}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
