import React, { useEffect, useMemo, useState } from 'react';
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
import { Modal } from '../ui/Modal';
import { formatearQuetzales } from '../../utils/pos';

const etiquetasMetodo = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
};

const normalizarMonto = (valor) => {
  const monto = Number(String(valor ?? '').trim().replace(',', '.'));
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
  onConciliarPagoPOS,
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
  const esIncidencia = pagoPOS?.estado === 'incidencia';
  const puedeCerrar = !procesando && (!pagoEnviado || esIncidencia);
  const puedeConfirmarEfectivo = esEfectivo
    && items.length > 0
    && !montoInsuficiente
    && !procesando;
  const puedeEnviarPagoPOS = esTarjeta
    && items.length > 0
    && !procesando
    && !pagoEnviado;
  const puedeConciliar = esTarjeta && esIncidencia && !procesando;
  const resumenItems = useMemo(() => items.slice(0, 4), [items]);
  const restantes = Math.max(0, items.length - resumenItems.length);
  const etiquetaAccion = esIncidencia
    ? 'Conciliar venta'
    : esTarjeta ? 'Cobrar con tarjeta' : 'Confirmar cobro';

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    if (puedeConfirmarEfectivo) {
      onConfirm({ montoRecibido: Number(montoNumerico.toFixed(2)) });
      return;
    }
    if (puedeConciliar) {
      onConciliarPagoPOS();
      return;
    }
    if (puedeEnviarPagoPOS) onCrearPagoPOS();
  };

  return (
    <Modal
      isOpen={isOpen}
      size="lg"
      labelledBy="titulo-cobro-venta"
      describedBy="descripcion-cobro-venta"
      onClose={onClose}
      busy={!puedeCerrar}
      limitarAltura
      panelClassName="pos-checkout-dialog"
    >
      <header className="pos-checkout-dialog-head">
        <div className="pos-checkout-dialog-title">
          <span aria-hidden="true"><ReceiptText /></span>
          <div>
            <h2 id="titulo-cobro-venta">Cobro de venta</h2>
            <span id="descripcion-cobro-venta">
              {items.length} {items.length === 1 ? 'artículo' : 'artículos'} · Revisa los datos antes de confirmar
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={!puedeCerrar}
          aria-label="Cerrar cobro"
          className="pos-checkout-dialog-close"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <form onSubmit={manejarEnvio} className="pos-checkout-dialog-form">
        <div className="pos-checkout-amount">
          <div>
            <span>Total a cobrar</span>
            <strong>{formatearQuetzales(totalNumerico)}</strong>
          </div>
          <span className="pos-checkout-method">
            {esTarjeta ? <CreditCard aria-hidden="true" /> : <Banknote aria-hidden="true" />}
            {etiquetasMetodo[metodoPago] || metodoPago}
          </span>
        </div>

        <div className="pos-checkout-dialog-grid">
          <section className="pos-checkout-payment" aria-labelledby="titulo-datos-pago">
            <div className="pos-checkout-section-head">
              <div>
                <h3 id="titulo-datos-pago">Datos del pago</h3>
              </div>
              <p><User aria-hidden="true" />{clienteSeleccionado?.nombre_cliente || 'Consumidor final'}</p>
            </div>

            {esEfectivo && (
              <div className="pos-checkout-cash">
                <label htmlFor="monto-recibido">Monto recibido</label>
                <div className="pos-checkout-money-input">
                  <span aria-hidden="true">Q</span>
                  <input
                    id="monto-recibido"
                    name="monto_recibido"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={montoRecibido}
                    onChange={(evento) => setMontoRecibido(evento.target.value)}
                    disabled={procesando}
                    aria-invalid={montoInsuficiente}
                    aria-describedby={montoInsuficiente ? 'error-monto-recibido' : 'ayuda-monto-recibido'}
                    placeholder="Ej.: 20.00…"
                  />
                </div>
                <p id="ayuda-monto-recibido" className="pos-checkout-help">
                  Puedes escribir el monto con punto o coma decimal.
                </p>
                {montoInsuficiente && (
                  <p id="error-monto-recibido" className="pos-checkout-field-error">
                    <AlertCircle aria-hidden="true" />
                    El monto recibido no cubre el total de la venta.
                  </p>
                )}
                <div className="pos-checkout-change" aria-live="polite">
                  <span>Cambio a entregar</span>
                  <strong>{formatearQuetzales(cambio)}</strong>
                </div>
              </div>
            )}

            {esTarjeta && (
              <div className={`pos-checkout-card${esIncidencia ? ' is-incident' : ''}`} aria-live="polite">
                <span className={pagoEnviado && !esIncidencia ? 'is-pending' : ''} aria-hidden="true">
                  {esIncidencia ? <AlertCircle /> : pagoEnviado ? <Loader2 /> : <CreditCard />}
                </span>
                <div>
                  <strong>
                    {esIncidencia
                      ? 'Cobro confirmado; venta pendiente'
                      : pagoEnviado ? 'Esperando confirmación del POS' : 'Dispositivo listo para cobrar'}
                  </strong>
                  <p>
                    {esIncidencia
                      ? 'No vuelvas a cobrar. Usa la conciliación para completar únicamente la venta en FarmaCom.'
                      : pagoEnviado
                      ? 'La venta se registrará automáticamente cuando el POS confirme el pago. No cierres esta ventana.'
                      : 'Acerca o inserta la tarjeta. La venta se registrará únicamente cuando el POS confirme el pago.'}
                  </p>
                  {esIncidencia && (
                    <dl className="pos-checkout-incident-refs">
                      <div><dt>Referencia</dt><dd>{pagoPOS.referencia_pago || 'No informada'}</dd></div>
                      <div><dt>Operación</dt><dd>{pagoPOS.external_id}</dd></div>
                    </dl>
                  )}
                </div>
              </div>
            )}

            {!metodoSoportado && (
              <div className="pos-checkout-notice pos-checkout-notice--warning" role="status">
                <AlertCircle aria-hidden="true" />
                Este método de pago aún no está disponible.
              </div>
            )}

            {error && (
              <div className="pos-checkout-notice pos-checkout-notice--error" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </section>

          <aside className="pos-checkout-summary" aria-labelledby="titulo-resumen-cobro">
            <div className="pos-checkout-summary-head">
              <h3 id="titulo-resumen-cobro">Resumen de productos</h3>
              <span>{items.length}</span>
            </div>
            <ul>
              {resumenItems.map((item) => (
                <li key={item.clave}>
                  <div>
                    <strong>{item.nombre_comercial}</strong>
                    <span>{item.cantidad} × {formatearQuetzales(item.precioAplicado ?? item.precioUnitario)}</span>
                  </div>
                  <strong>{formatearQuetzales((item.precioAplicado ?? item.precioUnitario) * item.cantidad)}</strong>
                </li>
              ))}
            </ul>
            {restantes > 0 && <p>Y {restantes} {restantes === 1 ? 'producto más' : 'productos más'}</p>}
          </aside>
        </div>

        <footer className="pos-checkout-dialog-actions">
          <button type="button" onClick={onClose} disabled={!puedeCerrar} className="pos-checkout-cancel">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!puedeConfirmarEfectivo && !puedeEnviarPagoPOS && !puedeConciliar}
            className="pos-checkout-confirm"
          >
            {procesando ? <Loader2 className="pos-checkout-spinner" aria-hidden="true" /> : esIncidencia ? <ReceiptText aria-hidden="true" /> : esTarjeta ? <CreditCard aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            <span>{etiquetaAccion}</span>
          </button>
        </footer>
      </form>
    </Modal>
  );
}
