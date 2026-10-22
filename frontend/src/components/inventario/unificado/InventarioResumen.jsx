import React from 'react';
import { AlertTriangle, Boxes, Clock3, PackageX, TriangleAlert } from 'lucide-react';

const TARJETAS = [
  {
    key: 'total',
    campo: 'total_productos',
    etiqueta: 'Productos',
    detalle: 'Registrados en el catálogo',
    icono: Boxes,
  },
  {
    key: 'agotado',
    campo: 'productos_agotados',
    etiqueta: 'Agotados',
    detalle: 'Sin existencias',
    tipo: 'estado_stock',
    valor: 'agotado',
    icono: PackageX,
  },
  {
    key: 'poco_stock',
    campo: 'productos_poco_stock',
    etiqueta: 'Poco stock',
    detalle: 'Igual o menor al mínimo',
    tipo: 'estado_stock',
    valor: 'poco_stock',
    icono: AlertTriangle,
  },
  {
    key: 'vencido',
    campo: 'productos_vencidos',
    etiqueta: 'Vencidos',
    detalle: 'Con existencias vencidas',
    tipo: 'estado_vencimiento',
    valor: 'vencido',
    icono: TriangleAlert,
  },
  {
    key: 'proximo_a_vencer',
    campo: 'productos_proximos_vencer',
    etiqueta: 'Próximos a vencer',
    detalle: 'Dentro del rango de alerta',
    tipo: 'estado_vencimiento',
    valor: 'proximo_a_vencer',
    icono: Clock3,
  },
];

export default function InventarioResumen({ resumen, filtros, cargando, onSeleccionar }) {
  return (
    <section aria-label="Resumen de inventario" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {TARJETAS.map(({ key, campo, etiqueta, detalle, tipo, valor, icono: Icono }) => {
        const activa = tipo ? filtros[tipo] === valor : !filtros.estado_stock && !filtros.estado_vencimiento;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={activa}
            onClick={() => onSeleccionar(tipo, valor)}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors ${
              activa ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200 hover:border-primary/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-primary">
                  {cargando ? '—' : (resumen?.[campo] ?? 0)}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">{etiqueta}</p>
                <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
              </div>
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <Icono className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
