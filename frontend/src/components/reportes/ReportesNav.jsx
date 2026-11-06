import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { navegarConTransicionDeVista } from '../../utils/viewTransition';
import styles from '../../styles/ReportsUI.module.css';

export default function ReportesNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const manejarNavegacion = (evento, ruta) => {
    navegarConTransicionDeVista({
      event: evento,
      navigate,
      destino: ruta,
      rutaActual: location.pathname,
    });
  };

  return (
    <nav aria-label="Tipos de reportes" className={styles.nav}>
      {[
        { ruta: '/reports', etiqueta: 'Ventas' },
        { ruta: '/reports/rentabilidad', etiqueta: 'Rentabilidad por sucursal' },
      ].map(({ ruta, etiqueta }) => (
        <NavLink key={ruta} to={ruta} end onClick={(evento) => manejarNavegacion(evento, ruta)}>
          {etiqueta}
        </NavLink>
      ))}
    </nav>
  );
}
