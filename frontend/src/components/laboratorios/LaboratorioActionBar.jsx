import React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import styles from '../../styles/ManagementUI.module.css';

export default function LaboratorioActionBar({ busqueda, onBusquedaChange, onCrear }) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <span className={styles.visuallyHidden}>Buscar laboratorios</span>
        <input
          type="search"
          name="q"
          autoComplete="off"
          aria-label="Buscar laboratorios"
          placeholder="Buscar por nombre, ciudad o dirección…"
          value={busqueda}
          onChange={onBusquedaChange}
        />
      </label>
      <button type="button" onClick={onCrear} className={`${styles.button} ${styles.primary}`}>
        <PlusCircle size={16} aria-hidden="true" />
        Nuevo laboratorio
      </button>
    </div>
  );
}
