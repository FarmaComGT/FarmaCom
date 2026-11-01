import React, { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import styles from '../../styles/ManagementUI.module.css';

export default function SucursalFormModal({
  isOpen,
  modoEdicion,
  formulario,
  ciudades,
  cargandoCiudades,
  guardando,
  errorFormulario,
  onClose,
  onSubmit,
  onChange,
}) {
  const tituloId = 'sucursal-form-title';
  const errorRef = useRef(null);
  useEffect(() => {
    if (errorFormulario) errorRef.current?.focus();
  }, [errorFormulario]);

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={guardando} size="medium">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
            <p>Registra la ubicación que verá el equipo durante la operación.</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="nombre_sucursal">Nombre de sucursal</label>
              <input
                id="nombre_sucursal"
                type="text"
                name="nombre_sucursal"
                autoComplete="organization"
                value={formulario.nombre_sucursal}
                onChange={onChange}
                className={styles.input}
                placeholder="Ej.: Farmacia Central Norte…"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="id_ciudad">Ciudad</label>
              <select
                id="id_ciudad"
                name="id_ciudad"
                value={formulario.id_ciudad}
                onChange={onChange}
                className={styles.input}
                disabled={cargandoCiudades}
              >
                <option value="">Selecciona una ciudad</option>
                {ciudades.map((ciudad) => <option key={ciudad.id_ciudad} value={ciudad.id_ciudad}>{ciudad.nombre_ciudad}</option>)}
              </select>
              {!cargandoCiudades && ciudades.length === 0 && <p className={styles.fieldError}>No hay ciudades registradas.</p>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="direccion_sucursal">Dirección</label>
            <textarea
              id="direccion_sucursal"
              name="direccion"
              autoComplete="street-address"
              value={formulario.direccion}
              onChange={onChange}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit();
              }}
              className={styles.input}
              placeholder="Ej.: Calle 10 #45-20…"
            />
          </div>

          {errorFormulario && <p ref={errorRef} tabIndex={-1} className={styles.fieldError} role="alert">{errorFormulario}</p>}

          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando || cargandoCiudades || ciudades.length === 0} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {modoEdicion ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
