import React from 'react';
import { useLocation } from 'react-router-dom';
import { TabsList, TabLink } from '../../ui/Tabs.jsx';

const pestanas = [
  { ruta: '/ventas/historial', etiqueta: 'Ventas', fin: true },
  { ruta: '/ventas/historial/productos', etiqueta: 'Resumen por producto', fin: false },
];

export default function HistorialVentasNav() {
  const { search } = useLocation();

  return (
    <TabsList as="nav" ariaLabel="Vistas del historial de ventas">
      {pestanas.map(({ ruta, etiqueta, fin }) => (
        <TabLink key={ruta} to={`${ruta}${search}`} end={fin}>{etiqueta}</TabLink>
      ))}
    </TabsList>
  );
}
