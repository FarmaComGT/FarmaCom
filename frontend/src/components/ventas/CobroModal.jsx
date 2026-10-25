import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  ReceiptText,
  User,
  X,
} from 'lucide-react';
import { formatearQuetzales } from '../../utils/pos';

const etiquetasMetodo = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
};

const normalizarMonto = (valor) => {
  const monto = Number(valor);
  return Number.isFinite(monto) ? monto : 0;
};

export default function CobroModal({
  isOpen,
  items,
  total,
  metodoPago,
  clienteSeleccionado,
  pagoPOS,
  procesando = false,
  error,
  onClose,
  onCrearPagoPOS,
  onConfirm,
}) {
  const [montoRecibido, setMontoRecibido] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMontoRecibido(metodoPago === 'efectivo' ? String(Number(total || 0).toFixed(2)) : '');
    }
  }, [isOpen, metodoPago, total]);

  const totalNumerico = normalizarMonto(total);
  const montoNumerico = normalizarMonto(montoRecibido);
  const cambio = Math.max(0, montoNumerico - totalNumerico);
  const esEfectivo = metodoPago === 'efectivo';
  const esTarjeta = metodoPago === 'tarjeta';
  const metodoSoportado = esEfectivo || esTarjeta;
  const montoInsuficiente = esEfectivo && montoNumerico < totalNumerico;
  const pagoEnviado = Boolean(pagoPOS?.external_id);
  const puedeCerrar = !procesando && !pagoEnviado;
  const puedeConfirmarEfectivo = esEfectivo
    && items.length > 0
    && !montoInsuficiente
    && !procesando;
  const puedeEnviarPagoPOS = esTarjeta
    && items.length > 0
    && !procesando
    && !pagoEnviado;

  const resumenItems = useMemo(() => items.slice(0, 3), [items]);
  const restantes = Math.max(0, items.length - resumenItems.length);

  if (!isOpen || typeof document === 'undefined') return null;

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    if (puedeConfirmarEfectivo) {
      onConfirm({ montoRecibido: Number(montoNumerico.toFixed(2)) });
      return;
    }

    if (puedeEnviarPagoPOS) {
      onCrearPagoPOS();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-headline text-lg font-extrabold text-primary">
                Cobro de venta
              </h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!puedeCerrar}
            aria-label="Cerrar"
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-5 px-6 py-5">
          <div className="rounded-2xl bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Total a cobrar
                </p>
                <p className="mt-1 font-mono text-4xl font-black tracking-tight text-primary">
                  {formatearQuetzales(totalNumerico)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-secondary shadow-sm">
                <Banknote className="h-3.5 w-3.5" />
                {etiquetasMetodo[metodoPago] || metodoPago}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                <User className="h-3.5 w-3.5" />
                Cliente
              </p>
              <p className="mt-1 truncate text-sm font-bold text-on-surface">
                {clienteSeleccionado?.nombre_cliente || 'Consumidor final'}
              </p>
            </div>

            {esEfectivo ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Cambio
                </p>
                <p className="mt-1 font-mono text-lg font-black text-primary">
                  {formatearQuetzales(cambio)}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  <CreditCard className="h-3.5 w-3.5" />
                  Estado
                </p>
                <p className="mt-1 truncate text-sm font-bold text-on-surface">
                  {pagoEnviado ? 'Pago en proceso' : 'Pendiente de iniciar'}
                </p>
              </div>
            )}
          </div>

          {esEfectivo && (
            <div className="space-y-2">
              <label htmlFor="monto-recibido" className="text-sm font-semibold text-slate-700">
                Monto recibido
              </label>
              <input
                id="monto-recibido"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={montoRecibido}
                onChange={(evento) => setMontoRecibido(evento.target.value)}
                disabled={procesando}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-lg font-extrabold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-400"
                placeholder="0.00"
                autoFocus
              />
              {montoInsuficiente && (
                <p className="text-sm font-semibold text-error">
                  El monto recibido no cubre el total de la venta.
                </p>
              )}
            </div>
          )}

          {esTarjeta && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-extrabold text-on-surface">
                  Cobro con tarjeta
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {pagoEnviado
                    ? 'Estamos verificando el pago. Espera un momento, por favor.'
                    : 'Acerca o inserta la tarjeta en el dispositivo. La venta se registrará cuando se verifique el pago.'}
                </p>
              </div>

              {pagoEnviado && (
                <p className="text-sm font-semibold text-amber-700">
                  La venta se registrará automáticamente cuando el pago sea confirmado.
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Resumen
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {resumenItems.map((item) => (
                <div key={item.clave} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-on-surface">{item.nombre_comercial}</p>
                    <p className="text-xs font-medium text-slate-400">
                      {item.cantidad} x {formatearQuetzales(item.precioAplicado ?? item.precioUnitario)}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono font-extrabold text-primary">
                    {formatearQuetzales((item.precioAplicado ?? item.precioUnitario) * item.cantidad)}
                  </p>
                </div>
              ))}
              {restantes > 0 && (
                <p className="px-4 py-3 text-sm font-semibold text-slate-500">
                  + {restantes} productos más
                </p>
              )}
            </div>
          </div>

          {!metodoSoportado && (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Este método de pago aún no está disponible.
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-xl border border-error/20 bg-error-container/40 px-4 py-3 text-sm font-semibold text-on-error-container">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={!puedeCerrar}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                !puedeConfirmarEfectivo
                && !puedeEnviarPagoPOS
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {procesando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : esTarjeta && !pagoEnviado ? (
                <CreditCard className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {procesando
                ? 'Procesando...'
                : esTarjeta && !pagoEnviado
                  ? 'Cobrar con tarjeta'
                  : esTarjeta
                    ? 'Pago en proceso'
                    : 'Confirmar cobro'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
