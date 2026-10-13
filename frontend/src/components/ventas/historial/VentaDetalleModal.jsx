import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { obtenerVentaPorId } from '../../../api/ventas';
import { formatearMoneda } from '../../../utils/reportes';

export default function VentaDetalleModal({ idVenta, onClose }) {
  const [estado, setEstado] = useState({ venta: null, cargando: false, error: null });

  useEffect(() => {
    if (!idVenta) return undefined;
    let vigente = true;
    setEstado({ venta: null, cargando: true, error: null });
    obtenerVentaPorId(idVenta)
      .then((venta) => vigente && setEstado({ venta, cargando: false, error: null }))
      .catch((error) => vigente && setEstado({ venta: null, cargando: false, error: error.message }));
    return () => { vigente = false; };
  }, [idVenta]);

  if (!idVenta) return null;
  const { venta, cargando, error } = estado;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-venta" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <header className="flex items-center justify-between gap-3">
          <h2 id="titulo-detalle-venta" className="font-headline text-xl font-extrabold text-primary">Detalle de venta #{idVenta}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle de venta" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        {cargando && <div role="status" className="mt-5 h-32 animate-pulse rounded-xl bg-slate-100" aria-label="Cargando detalle de venta" />}
        {error && <p role="alert" className="mt-5 text-sm font-semibold text-error">{error}</p>}
        {venta && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p><span className="font-bold">Sucursal:</span> {venta.nombre_sucursal}</p>
              <p><span className="font-bold">Cliente:</span> {venta.nombre_cliente || 'Consumidor final'}</p>
              <p><span className="font-bold">Atendió:</span> {venta.nombre_usuario}</p>
              <p><span className="font-bold">Total:</span> {formatearMoneda(venta.total)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-2">Producto</th><th className="py-2 text-right">Cantidad</th><th className="py-2 text-right">Precio</th><th className="py-2 text-right">Subtotal</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {venta.detalles.map((detalle) => (
                    <tr key={detalle.id_detalle_venta}><td className="py-3">{detalle.nombre_comercial}</td><td className="py-3 text-right">{detalle.cantidad}</td><td className="py-3 text-right">{formatearMoneda(detalle.precio_unitario)}</td><td className="py-3 text-right font-bold">{formatearMoneda(detalle.subtotal)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
