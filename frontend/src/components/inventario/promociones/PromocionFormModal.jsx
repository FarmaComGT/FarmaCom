import React, { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import useAvisoCambiosSinGuardar, { confirmarDescartarCambios } from '../../../hooks/useAvisoCambiosSinGuardar.js';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

const formatearMoneda = (valor) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 }).format(valor);

export default function PromocionFormModal({ isOpen, modoEdicion, producto, sucursales, formulario, hayCambios, guardando, cargandoPrecioReferencia, precioReferencia, error, campoError, onChange, onClose, onSubmit }) {
  const tituloId = 'titulo-promocion';
  const formularioRef = useRef(null);
  useAvisoCambiosSinGuardar(isOpen && hayCambios && !guardando);

  useEffect(() => {
    if (!error) return;
    const campo = campoError ? formularioRef.current?.elements.namedItem(campoError) : null;
    (campo || formularioRef.current?.querySelector('input:not(:disabled), select:not(:disabled)'))?.focus();
  }, [campoError, error]);

  const solicitarCierre = () => {
    if (guardando) return;
    if (!hayCambios || confirmarDescartarCambios()) onClose();
  };
  const etiquetaGuardar = modoEdicion ? 'Guardar cambios' : 'Crear promoción';
  const invalido = (campo) => Boolean(error && campoError === campo);

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={solicitarCierre} busy={guardando} size="medium">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar promoción' : 'Nueva promoción'}</h2>
            <p>{producto?.codigo} · {producto?.nombre_comercial}</p>
          </div>
          <button type="button" onClick={solicitarCierre} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>

        <form ref={formularioRef} onSubmit={onSubmit} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="promocion-sucursal">Sucursal</label>
            <select id="promocion-sucursal" name="id_sucursal" value={formulario.id_sucursal} onChange={onChange} disabled={guardando || modoEdicion} aria-invalid={invalido('id_sucursal')} className={styles.input}>
              <option value="">Selecciona una sucursal</option>
              {sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}
            </select>
            {modoEdicion && <p className={styles.helpText}>La sucursal no puede cambiarse después de crear la promoción.</p>}
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="promocion-cantidad">Cantidad mínima</label>
              <input id="promocion-cantidad" name="cantidad_minima" type="number" inputMode="numeric" min="1" step="1" value={formulario.cantidad_minima} onChange={onChange} disabled={guardando} aria-invalid={invalido('cantidad_minima')} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label htmlFor="promocion-precio">Precio promocional (Q)</label>
              <input id="promocion-precio" name="precio_promocion" type="number" inputMode="decimal" min="0.01" max={precioReferencia === null ? undefined : Math.max(0.01, precioReferencia - 0.01).toFixed(2)} step="0.01" value={formulario.precio_promocion} onChange={onChange} disabled={guardando} aria-invalid={invalido('precio_promocion')} className={styles.input} />
              <p className={precioReferencia === null ? styles.fieldError : styles.helpText}>
                {cargandoPrecioReferencia ? 'Consultando el precio normal…' : precioReferencia === null ? 'No hay lotes vendibles con precio en esta sucursal.' : `Debe ser menor que ${formatearMoneda(precioReferencia)}.`}
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="promocion-inicio">Fecha de inicio</label>
              <input id="promocion-inicio" name="fecha_inicio" type="date" value={formulario.fecha_inicio} onChange={onChange} disabled={guardando} aria-invalid={invalido('fecha_inicio')} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label htmlFor="promocion-fin">Fecha de finalización</label>
              <input id="promocion-fin" name="fecha_fin" type="date" min={formulario.fecha_inicio || undefined} value={formulario.fecha_fin} onChange={onChange} disabled={guardando} aria-invalid={invalido('fecha_fin')} className={styles.input} />
            </div>
          </div>

          {error && <p role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={solicitarCierre} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando || cargandoPrecioReferencia || precioReferencia === null} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {etiquetaGuardar}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
