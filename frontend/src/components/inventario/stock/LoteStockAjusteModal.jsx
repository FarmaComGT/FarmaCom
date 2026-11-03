import React, { useEffect, useRef, useState } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { Modal, ModalActions, ModalHeader } from '../../ui/Modal.jsx';

export default function LoteStockAjusteModal({
  lote,
  guardando = false,
  error = null,
  onClose,
  onSubmit,
}) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (!lote) return;
    setCantidad('');
    setMotivo('');
    setErrorLocal('');
  }, [lote]);

  useEffect(() => {
    if (errorLocal || error) errorRef.current?.focus();
  }, [error, errorLocal]);

  if (!lote) return null;
  const ajuste = Number(cantidad);
  const stockActual = Number(lote.stock_actual);
  const stockResultante = Number.isInteger(ajuste) ? stockActual + ajuste : stockActual;

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    if (!Number.isInteger(ajuste) || ajuste === 0) {
      setErrorLocal('Ingresa una cantidad entera distinta de 0. Usa un valor negativo para una salida.');
      return;
    }
    if (stockResultante < 0) {
      setErrorLocal('El ajuste no puede dejar existencias negativas.');
      return;
    }
    if (!motivo.trim()) {
      setErrorLocal('Describe el motivo del ajuste.');
      return;
    }
    setErrorLocal('');
    onSubmit({
      version: Number(lote.version || 1),
      stock_esperado: stockActual,
      cantidad_ajuste: ajuste,
      motivo: motivo.trim(),
    });
  };

  const enviarConAtajo = (evento) => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key === 'Enter') {
      evento.preventDefault();
      evento.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <Modal isOpen labelledBy="titulo-ajuste-stock" onClose={onClose} busy={guardando}>
      <ModalHeader
        title="Ajustar stock"
        titleId="titulo-ajuste-stock"
        subtitle={`Lote ${lote.numero_lote}`}
        icon={<SlidersHorizontal className="h-5 w-5" aria-hidden="true" />}
        onClose={onClose}
        disabled={guardando}
      />
      <form onSubmit={manejarEnvio} className="space-y-4 px-6 py-5" noValidate>
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div><p className="text-slate-500">Stock actual</p><p className="mt-1 text-xl font-black tabular-nums text-slate-900">{stockActual}</p></div>
          <div><p className="text-slate-500">Stock resultante</p><p className="mt-1 text-xl font-black tabular-nums text-primary">{stockResultante}</p></div>
        </div>
        <div className="space-y-1">
          <label htmlFor="cantidad_ajuste" className="text-sm font-semibold text-slate-700">Cantidad del ajuste</label>
          <input id="cantidad_ajuste" name="cantidad_ajuste" type="number" inputMode="numeric" step="1" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} placeholder="Ej.: -2 o 5…" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-primary/30" />
          <p className="text-xs text-slate-500">Valores positivos agregan existencias; valores negativos las descuentan.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="motivo_ajuste" className="text-sm font-semibold text-slate-700">Motivo</label>
          <textarea id="motivo_ajuste" name="motivo" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} onKeyDown={enviarConAtajo} maxLength={500} rows={3} placeholder="Ej.: Corrección por conteo físico…" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-primary/30" />
        </div>
        {(errorLocal || error) && <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm font-semibold text-error">{errorLocal || error}</p>}
        <ModalActions divided>
          <button type="button" onClick={onClose} disabled={guardando} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
          <button type="submit" disabled={guardando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>Registrar ajuste</span>
            {guardando && <span className="sr-only">Guardando…</span>}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
