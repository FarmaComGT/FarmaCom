import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertTriangle, Ban, CreditCard, X } from 'lucide-react';
import { formatearMoneda } from '../../../utils/reportes';

export default function VentaAnularModal({
  isOpen,
  venta,
  anulando,
  error,
  onClose,
  onConfirm,
}) {
  const [motivo, setMotivo] = useState('');
  const [motivoTocado, setMotivoTocado] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setMotivoTocado(false);
    }
  }, [isOpen]);

  if (!isOpen || !venta || typeof document === 'undefined') return null;

  const esTarjeta = venta.metodo_pago === 'tarjeta';
  const motivoNormalizado = motivo.trim();

  const cerrar = () => {
    if (!anulando) onClose();
  };

  const confirmar = (evento) => {
    evento.preventDefault();
    setMotivoTocado(true);
    if (!motivoNormalizado || esTarjeta || anulando) return;
    onConfirm(motivoNormalizado);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(evento) => evento.target === evento.currentTarget && cerrar()}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-anular-venta"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
              esTarjeta ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
            }`}
            >
              {esTarjeta ? <CreditCard className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            </span>
            <div>
              <h3 id="titulo-anular-venta" className="font-headline text-lg font-extrabold text-primary">
                {esTarjeta ? 'Venta con tarjeta' : 'Anular venta'}
              </h3>
              <p className="text-xs font-semibold text-slate-500">Venta #{venta.id_venta}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrar}
            disabled={anulando}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {esTarjeta ? (
          <div className="space-y-4 px-6 py-5">
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-extrabold">Esta venta no se puede anular desde FarmaCom.</p>
                  <p className="mt-1 leading-relaxed">
                    El pago debe gestionarse como reembolso en Recurrente. FarmaCom no modificará
                    la caja ni las existencias de esta venta.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={cerrar}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary/90"
              >
                Entendido
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={confirmar} className="space-y-4 px-6 py-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="leading-relaxed">
                  ¿Confirmas la anulación completa de esta venta por {formatearMoneda(venta.total)}?
                  No se permiten devoluciones parciales: se restaurarán todos los productos y esta
                  acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="motivo-anulacion-venta" className="text-sm font-bold text-slate-700">
                Motivo de anulación <span className="text-error">*</span>
              </label>
              <textarea
                id="motivo-anulacion-venta"
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                onBlur={() => setMotivoTocado(true)}
                maxLength={500}
                rows={4}
                required
                disabled={anulando}
                aria-invalid={motivoTocado && !motivoNormalizado}
                aria-describedby="ayuda-motivo-anulacion"
                placeholder="Explica por qué se anula la venta"
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100"
              />
              <div id="ayuda-motivo-anulacion" className="mt-1 flex justify-between gap-3 text-xs">
                <span className={motivoTocado && !motivoNormalizado ? 'font-semibold text-error' : 'text-slate-500'}>
                  {motivoTocado && !motivoNormalizado ? 'El motivo es obligatorio.' : 'Máximo 500 caracteres.'}
                </span>
                <span className="text-slate-400">{motivo.length}/500</span>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={cerrar}
                disabled={anulando}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={anulando || !motivoNormalizado}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {anulando ? 'Anulando...' : 'Sí, anular venta'}
              </button>
            </div>
          </form>
        )}
      </motion.section>
    </div>,
    document.body,
  );
}
