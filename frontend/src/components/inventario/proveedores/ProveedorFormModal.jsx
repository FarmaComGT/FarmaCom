import React, { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import useAvisoCambiosSinGuardar, { confirmarDescartarCambios } from '../../../hooks/useAvisoCambiosSinGuardar.js';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProveedorFormModal({ isOpen, modoEdicion, formulario, hayCambios, guardando, errorFormulario, onClose, onSubmit, onChange }) {
  const tituloId = 'proveedor-form-title';
  const nombreRef = useRef(null);
  useAvisoCambiosSinGuardar(isOpen && hayCambios && !guardando);

  useEffect(() => {
    if (errorFormulario) nombreRef.current?.focus();
  }, [errorFormulario]);

  const solicitarCierre = () => {
    if (guardando) return;
    if (!hayCambios || confirmarDescartarCambios()) onClose();
  };
  const etiquetaGuardar = modoEdicion ? 'Guardar cambios' : 'Crear proveedor';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={solicitarCierre} busy={guardando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
            <p>Usa el nombre comercial con el que identificas al distribuidor.</p>
          </div>
          <button type="button" onClick={solicitarCierre} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="nombre_proveedor">Nombre</label>
            <input ref={nombreRef} id="nombre_proveedor" type="text" name="nombre" autoComplete="organization" value={formulario.nombre} onChange={onChange} maxLength={150} aria-invalid={Boolean(errorFormulario)} aria-describedby={errorFormulario ? 'proveedor-form-error' : 'proveedor-form-help'} className={styles.input} placeholder="Ej.: Distribuidora Farmacéutica S. A.…" />
            <p id="proveedor-form-help" className={styles.helpText}>Máximo 150 caracteres.</p>
          </div>
          {errorFormulario && <p id="proveedor-form-error" role="alert" className={styles.fieldError}>{errorFormulario}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={solicitarCierre} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {etiquetaGuardar}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
