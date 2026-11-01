import React from 'react';
import { PlusCircle, Search } from 'lucide-react';
import styles from '../../styles/ManagementUI.module.css';

export default function UsuarioActionBar({ busqueda, onBusquedaChange, onCrear }) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <span className={styles.visuallyHidden}>Buscar usuarios</span>
        <input
          type="text"
          name="q"
          autoComplete="off"
          placeholder="Buscar por nombre o correo…"
          value={busqueda}
          onChange={onBusquedaChange}
        />
      </label>
      <button type="button" onClick={onCrear} className={`${styles.button} ${styles.primary}`}>
        <PlusCircle size={16} aria-hidden="true" />
        Nuevo usuario
      </button>
    </div>
  );
}
