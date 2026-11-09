import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProductoInventarioConfig({ formulario, onChange }) {
  return (
    <section className={styles.section} aria-labelledby="producto-inventario-title">
      <h3 id="producto-inventario-title" className={styles.sectionHeading}>Configuración de inventario</h3>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="stock_minimo">Stock mínimo <span className={styles.optional}>(opcional)</span></label>
          <input id="stock_minimo" type="number" inputMode="numeric" name="stock_minimo" value={formulario.stock_minimo} onChange={onChange} placeholder="0" min="0" step="1" className={styles.input} />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="meses_alerta_vencimiento">Meses de alerta de vencimiento</label>
        <input id="meses_alerta_vencimiento" type="number" inputMode="numeric" name="meses_alerta_vencimiento" value={formulario.meses_alerta_vencimiento} onChange={onChange} placeholder="Ej.: 6…" min="1" step="1" required className={styles.input} />
      </div>
    </section>
  );
}
