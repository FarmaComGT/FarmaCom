import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { navegarConTransicionDeVista } from '../../utils/viewTransition';
import styles from '../../styles/ManagementUI.module.css';

const tabs = [
  { label: 'Sucursales', path: '/sucursales' },
  { label: 'Laboratorios', path: '/laboratorios' },
  { label: 'Ciudades', path: '/ciudades' },
];

export default function SucursalesSubNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navegarConTransicion = (event, path) => {
    navegarConTransicionDeVista({
      event,
      navigate,
      destino: path,
      rutaActual: pathname,
    });
  };

  return (
    <nav className={styles.subnav} aria-label="Administración de ubicaciones">
      {tabs.map(({ label, path }) => (
        <NavLink
          key={path}
          to={path}
          end
          onClick={(event) => navegarConTransicion(event, path)}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
