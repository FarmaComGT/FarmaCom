import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CreditCard, LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog';
import { formatearMoneda } from '../../../utils/reportes';
import ui from '../../../styles/ManagementUI.module.css';
import styles from '../../../pages/ventas/HistorialVentas.module.css';

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
  const motivoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setMotivoTocado(false);
    }
  }, [isOpen]);

  const esTarjeta = venta?.metodo_pago === 'tarjeta';
  const motivoNormalizado = motivo.trim();

  const cerrar = () => {
    if (!anulando) onClose();
  };

  const confirmar = (evento) => {
    evento.preventDefault();
    setMotivoTocado(true);
    if (!motivoNormalizado || esTarjeta || anulando) {
      if (!motivoNormalizado && !esTarjeta) motivoRef.current?.focus();
      return;
    }
    onConfirm(motivoNormalizado);
  };

  return (
    <AccessibleDialog
      open={Boolean(isOpen && venta)}
      labelledBy="titulo-anular-venta"
      describedBy="descripcion-anular-venta"
      onClose={cerrar}
      busy={anulando}
      size="small"
      className={styles.dialog}
      initialFocusRef={esTarjeta ? undefined : motivoRef}
    >
      <header className={styles.dialogHeader}>
        <div>
          <h2 id="titulo-anular-venta">{esTarjeta ? 'Venta con tarjeta' : 'Anular venta'}</h2>
          <p id="descripcion-anular-venta">Venta #{venta?.id_venta}</p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          disabled={anulando}
          aria-label="Cerrar confirmación de anulación"
          className={styles.dialogClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      {esTarjeta ? (
        <div className={styles.dialogBody}>
          <div role="alert" className={styles.notice}>
            <CreditCard size={18} aria-hidden="true" />
            <div>
              <strong>Esta venta no se puede anular desde FarmaCom.</strong>
              <p>Gestiona el pago como reembolso en Recurrente. FarmaCom no modificará la caja ni las existencias de esta venta.</p>
            </div>
          </div>
          <div className={styles.dialogActions}>
            <button type="button" onClick={cerrar} className={`${ui.button} ${ui.primary}`}>Entendido</button>
          </div>
        </div>
      ) : (
        <form onSubmit={confirmar} className={`${styles.dialogBody} ${ui.form}`} noValidate>
          <div className={styles.confirmationText}>
            <AlertTriangle size={18} aria-hidden="true" />
            <p>
              ¿Confirmas la anulación completa de esta venta por {formatearMoneda(venta?.total)}?
              No se permiten devoluciones parciales: se restaurarán todos los productos y esta acción no se puede deshacer.
            </p>
          </div>

          <div className={ui.field}>
            <label htmlFor="motivo-anulacion-venta" className="campo-requerido">Motivo de anulación</label>
            <textarea
              ref={motivoRef}
              id="motivo-anulacion-venta"
              name="motivo_anulacion"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              onBlur={() => setMotivoTocado(true)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) evento.currentTarget.form?.requestSubmit();
              }}
              maxLength={500}
              rows={4}
              required
              disabled={anulando}
              aria-invalid={motivoTocado && !motivoNormalizado}
              aria-describedby="ayuda-motivo-anulacion"
              placeholder="Ejemplo: cobro duplicado…"
              className={ui.input}
            />
            <div id="ayuda-motivo-anulacion" className={styles.counter} aria-live="polite">
              {motivoTocado && !motivoNormalizado ? 'El motivo es obligatorio. ' : 'Máximo 500 caracteres. '}
              {motivo.length}/500
            </div>
          </div>

          {error && <p role="alert" className={ui.alert}>{error}</p>}

          <div className={styles.dialogActions}>
            <button type="button" onClick={cerrar} disabled={anulando} className={ui.button}>Volver</button>
            <button type="submit" disabled={anulando} className={`${ui.button} ${ui.dangerPrimary}`}>
              {anulando && <LoaderCircle size={16} className={ui.spinner} aria-hidden="true" />}
              Sí, anular venta
            </button>
          </div>
        </form>
      )}
    </AccessibleDialog>
  );
}
