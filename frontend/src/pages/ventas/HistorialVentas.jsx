import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useVentas } from '../../hooks/useHistorialVentas';
import { formatearMoneda } from '../../utils/reportes';
import VentaDetalleModal from '../../components/ventas/historial/VentaDetalleModal';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Guatemala',
});

const formatearFecha = (valor) => {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : FORMATO_FECHA.format(fecha);
};

export default function HistorialVentas() {
  const { filtros } = useOutletContext();
  const { datos, cargando, error, recargar } = useVentas(filtros);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  if (cargando) return <div role="status" className="h-52 animate-pulse rounded-2xl bg-slate-100" aria-label="Cargando historial de ventas" />;
  if (error) return <div role="alert" className="rounded-2xl border border-error/20 bg-error/5 p-6 text-center"><p className="text-sm font-semibold text-error">{error}</p><button type="button" onClick={recargar} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Reintentar</button></div>;
  if (datos.length === 0) return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No hay ventas en el período seleccionado.</div>;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {['Venta', 'Fecha', 'Sucursal', 'Cliente', 'Atendió', 'Artículos', 'Pago', 'Total', 'Estado', 'Detalle'].map((titulo) => <th key={titulo} className={`px-4 py-3 font-bold ${titulo === 'Detalle' ? 'text-center' : ''}`}>{titulo}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datos.map((venta) => (
              <tr key={venta.id_venta} className="hover:bg-primary/[0.02]">
                <td className="px-4 py-3 font-bold text-primary">#{venta.id_venta}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatearFecha(venta.fecha_venta)}</td>
                <td className="px-4 py-3">{venta.nombre_sucursal}</td>
                <td className="px-4 py-3">{venta.nombre_cliente || 'Consumidor final'}</td>
                <td className="px-4 py-3">{venta.nombre_usuario}</td>
                <td className="px-4 py-3 text-center">{venta.cantidad_articulos}</td>
                <td className="px-4 py-3 capitalize">{venta.metodo_pago}</td>
                <td className="px-4 py-3 font-bold">{formatearMoneda(venta.total)}</td>
                <td className="px-4 py-3 capitalize">{venta.estado}</td>
                <td className="px-4 py-3 text-center">
                  <button type="button" aria-label={`Ver detalle de venta ${venta.id_venta}`} onClick={() => setVentaSeleccionada(venta.id_venta)} className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-primary transition hover:bg-primary/10 active:scale-95">
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VentaDetalleModal idVenta={ventaSeleccionada} onClose={() => setVentaSeleccionada(null)} />
    </>
  );
}
