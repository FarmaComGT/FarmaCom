import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { navegarConTransicionDeVista } from '../../../utils/viewTransition';
import ui from '../../../styles/ManagementUI.module.css';

const pestanas = [
  { ruta: '/ventas/historial', etiqueta: 'Ventas', fin: true },
  { ruta: '/ventas/historial/productos', etiqueta: 'Resumen por producto', fin: false },
];

export default function HistorialVentasNav() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const navegarConTransicion = (event, ruta) => {
    navegarConTransicionDeVista({
      event,
      navigate,
      destino: `${ruta}${search}`,
      rutaActual: `${pathname}${search}`,
    });
  };

  return (
    <nav aria-label="Vistas del historial de ventas" className={ui.subnav}>
      {pestanas.map(({ ruta, etiqueta, fin }) => (
        <NavLink
          key={ruta}
          to={`${ruta}${search}`}
          end={fin}
          onClick={(event) => navegarConTransicion(event, ruta)}
        >
          {etiqueta}
        </NavLink>
      ))}
    </nav>
  );
}
