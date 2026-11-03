import React from 'react';
import { Search, PlusCircle } from 'lucide-react';
import styles from '../../../styles/ManagementUI.module.css';

export default function CasaActionBar({ busqueda, onBusquedaChange, onCrear }) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <span className={styles.visuallyHidden}>Buscar casas farmacéuticas</span>
        <input
          type="text"
          name="q"
          autoComplete="off"
          value={busqueda}
          onChange={onBusquedaChange}
          placeholder="Buscar casa farmacéutica…"
        />
      </label>
      <button type="button" onClick={onCrear} className={`${styles.button} ${styles.primary}`}>
        <PlusCircle size={16} aria-hidden="true" />
        Nueva casa farmacéutica
      </button>
    </div>
  );
}
