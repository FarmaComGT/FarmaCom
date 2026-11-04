import { useToast } from '../../../context/ToastContext.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import useAvisoCambiosSinGuardar, { confirmarDescartarCambios } from '../../../hooks/useAvisoCambiosSinGuardar.js';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function PresentacionQuickCreateModal({ isOpen, guardando, presentacion = null, onClose, onGuardar }) {
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  const esEdicion = Boolean(presentacion);
  const nombreInicial = presentacion?.nombre || '';
  const hayCambios = isOpen && nombre !== nombreInicial;
  useAvisoCambiosSinGuardar(hayCambios && !guardando);

  useEffect(() => {
    if (isOpen) {
      setNombre(nombreInicial);
      setError(null);
    }
  }, [isOpen, nombreInicial]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError('El nombre es requerido.');
      return;
    }
    try {
      setError(null);
      await onGuardar({ nombre: nombreLimpio });
      toast.success('Presentación guardada correctamente.');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || `No se pudo ${esEdicion ? 'actualizar' : 'crear'} la presentación.`);
    }
  };

  const solicitarCierre = () => {
    if (guardando) return;
    if (!hayCambios || confirmarDescartarCambios()) onClose();
  };
  const tituloId = 'titulo-formulario-presentacion';
  const etiquetaGuardar = esEdicion ? 'Guardar cambios' : 'Crear presentación';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={solicitarCierre} busy={guardando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div><h2 id={tituloId}>{esEdicion ? 'Editar presentación' : 'Nueva presentación'}</h2><p>Define el formato en que se administra y vende el producto.</p></div>
          <button type="button" onClick={solicitarCierre} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <form onSubmit={manejarEnvio} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="nombre_presentacion">Nombre</label>
            <input id="nombre_presentacion" type="text" name="nombre_presentacion" autoComplete="off" value={nombre} onChange={(evento) => { setNombre(evento.target.value); setError(null); }} placeholder="Ej.: Frasco, sobre o ampolla…" maxLength={100} className={styles.input} />
          </div>
          {error && <p ref={errorRef} tabIndex={-1} role="alert" className={styles.fieldError}>{error}</p>}
          <div className={styles.dialogActions}>
            <button type="button" onClick={solicitarCierre} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando} className={`${styles.button} ${styles.primary}`}>{guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}{etiquetaGuardar}</button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
