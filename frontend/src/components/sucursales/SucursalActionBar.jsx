import React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import styles from '../../styles/ManagementUI.module.css';

export default function SucursalActionBar({ busqueda, onBusquedaChange, onCrear }) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <span className={styles.visuallyHidden}>Buscar sucursales</span>
        <input
          type="search"
          name="q"
          autoComplete="off"
          value={busqueda}
          onChange={onBusquedaChange}
          placeholder="Buscar por nombre o dirección…"
        />
      </label>
      <button type="button" onClick={onCrear} className={`${styles.button} ${styles.primary}`}>
        <PlusCircle size={16} aria-hidden="true" />
        Nueva sucursal
      </button>
    </div>
  );
}
