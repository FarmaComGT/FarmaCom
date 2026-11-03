import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProductoDatosGenerales({ formulario, codigoMostrado, onChange, onToggleActivo }) {
  return (
    <section className={styles.section} aria-labelledby="producto-datos-title">
      <h3 id="producto-datos-title" className={styles.sectionHeading}>Datos generales</h3>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="codigo_producto">Código</label>
          <input id="codigo_producto" type="text" value={codigoMostrado} disabled className={styles.input} />
          <p className={styles.helpText}>Se genera a partir de la presentación elegida.</p>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Estado</span>
          <div className={styles.switchRow}>
            <button type="button" role="switch" aria-checked={formulario.activo} aria-label="Producto activo" onClick={onToggleActivo} className={styles.switchButton}>
              <span className={styles.switchThumb} aria-hidden="true" />
            </button>
            <div>
              <strong>{formulario.activo ? 'Activo' : 'Inactivo'}</strong>
              <span>{formulario.activo ? 'Disponible para operaciones nuevas.' : 'Oculto para operaciones nuevas.'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="nombre_comercial">Nombre comercial</label>
        <input id="nombre_comercial" type="text" name="nombre_comercial" autoComplete="off" value={formulario.nombre_comercial} onChange={onChange} placeholder="Ej.: Aspirina Forte…" maxLength={150} required className={styles.input} />
      </div>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="nombre_generico">Nombre genérico</label>
          <input id="nombre_generico" type="text" name="nombre_generico" autoComplete="off" value={formulario.nombre_generico} onChange={onChange} placeholder="Ej.: Ácido acetilsalicílico…" maxLength={150} required className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor="concentracion">Concentración <span className={styles.optional}>(opcional)</span></label>
          <input id="concentracion" type="text" name="concentracion" autoComplete="off" value={formulario.concentracion} onChange={onChange} placeholder="Ej.: 500 mg…" maxLength={50} className={styles.input} />
        </div>
      </div>
    </section>
  );
}
