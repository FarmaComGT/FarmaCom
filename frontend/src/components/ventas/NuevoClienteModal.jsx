import { useToast } from '../../context/ToastContext.jsx';
import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import styles from '../../styles/ManagementUI.module.css';
import './PuntoVentaModales.css';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { esNitValido, MENSAJE_NIT_INVALIDO, normalizarNit } from '../../utils/nit';

const formularioInicial = {
  nombre_cliente: '',
  nit: '',
  observaciones: '',
};

export default function NuevoClienteModal({
  isOpen,
  onClose,
  onCrear,
}) {
  const toast = useToast();
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormulario(formularioInicial);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const manejarCambio = (evento) => {
    setFormulario((actual) => ({
      ...actual,
      [evento.target.name]: evento.target.value,
    }));
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    const nombreCliente = formulario.nombre_cliente.trim();

    if (!nombreCliente) {
      setError('El nombre del cliente es requerido.');
      return;
    }

    if (!esNitValido(formulario.nit)) {
      setError(MENSAJE_NIT_INVALIDO);
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      await onCrear({
        nombre_cliente: nombreCliente,
        nit: normalizarNit(formulario.nit) || null,
        observaciones: formulario.observaciones.trim() || null,
      });
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo agregar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} busy={guardando} labelledBy="titulo-nuevo-cliente" limitarAltura panelClassName={`pos-form-dialog ${styles.dialogContent}`}>
      <header className={styles.dialogHeader}>
        <div><h2 id="titulo-nuevo-cliente">Nuevo cliente</h2><p>Se seleccionará automáticamente en la venta.</p></div>
        <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar" className={`${styles.button} ${styles.iconButton}`}><X size={18} aria-hidden="true" /></button>
      </header>
      <form onSubmit={manejarEnvio} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="nombre-cliente-pos" className="campo-requerido">Nombre completo</label>
          <input id="nombre-cliente-pos" name="nombre_cliente" value={formulario.nombre_cliente} onChange={manejarCambio} required maxLength={150} autoComplete="name" autoFocus placeholder="Ej. María López…" className={styles.input} disabled={guardando} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nit-cliente-pos">NIT <span className={styles.optional}>(opcional)</span></label>
          <input id="nit-cliente-pos" name="nit" value={formulario.nit} onChange={manejarCambio} maxLength={20} autoComplete="off" spellCheck={false} autoCapitalize="characters" placeholder="Ej. 1234567-K…" className={styles.input} disabled={guardando} />
        </div>
        <div className={styles.field}>
          <label htmlFor="observaciones-cliente-pos">Observaciones <span className={styles.optional}>(opcional)</span></label>
          <textarea id="observaciones-cliente-pos" name="observaciones" value={formulario.observaciones} onChange={manejarCambio} maxLength={2000} rows={3} placeholder="Información útil para futuras compras…" className={styles.input} disabled={guardando} />
        </div>
        {error && <p role="alert" className={styles.fieldError}><AlertCircle size={16} aria-hidden="true" /> {error}</p>}
        <footer className={styles.dialogActions}>
          <button type="button" onClick={onClose} disabled={guardando} className={styles.button}>Cancelar</button>
          <button type="submit" disabled={guardando} className={`${styles.button} ${styles.primary}`}>
            {guardando && <Loader2 size={16} className="pos-modal-spinner" aria-hidden="true" />}Agregar y seleccionar
          </button>
        </footer>
      </form>
    </Modal>
  );
}
