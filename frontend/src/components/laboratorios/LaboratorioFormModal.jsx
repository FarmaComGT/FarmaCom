import React, { useEffect, useRef } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import styles from '../../styles/ManagementUI.module.css';

export default function LaboratorioFormModal({
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
  const tituloId = 'titulo-formulario-laboratorio';
  const errorRef = useRef(null);

  useEffect(() => {
    if (errorFormulario) errorRef.current?.focus();
  }, [errorFormulario]);

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={guardando} size="medium">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar laboratorio' : 'Nuevo laboratorio'}</h2>
            <p>Registra la ubicación donde se atenderán pacientes.</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="nombre_laboratorio" className="campo-requerido">Nombre del laboratorio</label>
              <input aria-required="true"
                id="nombre_laboratorio"
                type="text"
                name="nombre_laboratorio"
                autoComplete="organization"
                value={formulario.nombre_laboratorio}
                onChange={onChange}
                className={styles.input}
                placeholder="Ej.: Laboratorio Central…"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="id_ciudad" className="campo-requerido">Ciudad</label>
              <select aria-required="true"
                id="id_ciudad"
                name="id_ciudad"
                value={formulario.id_ciudad}
                onChange={onChange}
                disabled={cargandoCiudades}
                className={styles.input}
              >
                <option value="">Selecciona una ciudad</option>
                {ciudades.map((ciudad) => <option key={ciudad.id_ciudad} value={ciudad.id_ciudad}>{ciudad.nombre_ciudad}</option>)}
              </select>
              {!cargandoCiudades && ciudades.length === 0 && <p className={styles.fieldError}>No hay ciudades registradas.</p>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="direccion_laboratorio" className="campo-requerido">Dirección</label>
            <textarea aria-required="true"
              id="direccion_laboratorio"
              name="direccion"
              autoComplete="street-address"
              value={formulario.direccion}
              onChange={onChange}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit();
              }}
              className={styles.input}
              placeholder="Ej.: 6a avenida 10-25, zona 1…"
            />
          </div>

          {errorFormulario && <p ref={errorRef} tabIndex={-1} role="alert" className={styles.fieldError}>{errorFormulario}</p>}

          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando || cargandoCiudades || ciudades.length === 0} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {modoEdicion ? 'Guardar cambios' : 'Crear laboratorio'}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
