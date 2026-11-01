import React from 'react';
import { History, Landmark, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import styles from './CajaSubNav.module.css';

export default function CajaSubNav({ rol }) {
  const puedeVerHistorial = ['dueno', 'administrador'].includes(rol);

  return (
    <nav aria-label="Secciones de caja" className={styles.nav}>
      <NavLink to="/caja" end className={styles.link}>
        <Landmark size={16} aria-hidden="true" />
        Operación
      </NavLink>
      {puedeVerHistorial && (
        <>
          <NavLink to="/caja/historial" className={styles.link}>
            <History size={16} aria-hidden="true" />
            Historial
          </NavLink>
          <NavLink to="/caja/administracion" className={styles.link}>
            <Settings size={16} aria-hidden="true" />
            Administración
          </NavLink>
        </>
      )}
    </nav>
  );
}
