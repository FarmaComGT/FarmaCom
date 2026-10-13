import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useResumenProductos } from '../../hooks/useHistorialVentas';
import { formatearMoneda, formatearNumero } from '../../utils/reportes';

export default function ResumenProductosVentas() {
  const { filtros } = useOutletContext();
  const { datos, cargando, error, recargar } = useResumenProductos(filtros);

  if (cargando) return <div role="status" className="h-52 animate-pulse rounded-2xl bg-slate-100" aria-label="Cargando resumen por producto" />;
  if (error) return <div role="alert" className="rounded-2xl border border-error/20 bg-error/5 p-6 text-center"><p className="text-sm font-semibold text-error">{error}</p><button type="button" onClick={recargar} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Reintentar</button></div>;
  if (datos.length === 0) return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No hay productos vendidos en el período seleccionado.</div>;

  const totales = datos.reduce((acumulado, producto) => ({
    cantidad: acumulado.cantidad + producto.cantidad_vendida,
    suma: acumulado.suma + producto.suma_total,
  }), { cantidad: 0, suma: 0 });

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="w-16 px-5 py-3">#</th><th className="px-5 py-3">Cant. vendida</th><th className="px-5 py-3">Nombre del producto</th><th className="px-5 py-3 text-right">Suma total</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {datos.map((producto, indice) => (
            <tr key={producto.id_producto} className="hover:bg-primary/[0.02]"><td className="px-5 py-4 text-slate-400">{indice + 1}.</td><td className="px-5 py-4 font-bold text-primary">{formatearNumero(producto.cantidad_vendida)}</td><td className="px-5 py-4 font-semibold text-slate-700">{producto.nombre_producto}</td><td className="px-5 py-4 text-right font-bold">{formatearMoneda(producto.suma_total)}</td></tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-extrabold"><tr><td className="px-5 py-4" /><td className="px-5 py-4">{formatearNumero(totales.cantidad)}</td><td className="px-5 py-4">Total</td><td className="px-5 py-4 text-right text-primary">{formatearMoneda(totales.suma)}</td></tr></tfoot>
      </table>
    </div>
  );
}
