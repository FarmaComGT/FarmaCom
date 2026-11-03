import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../../styles/ManagementUI.module.css';

const tabs = [
  { label: 'Inventario', path: '/inventario' },
  { label: 'Categorías', path: '/inventario/categorias' },
  { label: 'Proveedores', path: '/inventario/proveedores' },
  { label: 'Casas farmacéuticas', path: '/inventario/casas' },
  { label: 'Promociones', path: '/inventario/promociones' },
];

export default function InventarioSubNav() {
  return (
    <nav aria-label="Secciones de inventario" className={styles.subnav}>
      {tabs.map(({ label, path }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/inventario'}
          aria-label={label}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
