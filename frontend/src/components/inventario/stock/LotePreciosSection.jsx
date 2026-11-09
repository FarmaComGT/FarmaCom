import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

function Campo({ id, name, label, value, onChange, min, step, required, placeholder, inputMode = 'decimal' }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}{!required && <span className={styles.optional}> (opcional)</span>}</label>
      <input id={id} name={name} type="number" inputMode={inputMode} value={value} onChange={(evento) => onChange(evento.target.value)} min={min} step={step} required={required} className={styles.input} placeholder={placeholder} />
    </div>
  );
}

export default function LotePreciosSection({ formulario, onPrecioChange }) {
  return (
    <section className={styles.section} aria-labelledby="lote-precios-title">
      <h3 id="lote-precios-title" className={styles.sectionHeading}>Precio de venta</h3>
      <div className={styles.formGrid}>
        <Campo id="margen_ganancia_lote" name="margen_ganancia" label="Margen (%)" value={formulario.margen_ganancia} onChange={(valor) => onPrecioChange('margen_ganancia', valor)} min="0" step="0.0001" required placeholder="0" />
        <Campo id="precio_venta_lote" name="precio_venta" label="Precio de venta (Q)" value={formulario.precio_venta} onChange={(valor) => onPrecioChange('precio_venta', valor)} min="0" step="0.01" required placeholder="0.00" />
      </div>
    </section>
  );
}
