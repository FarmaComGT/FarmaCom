import React from 'react';
import { TabsList, TabLink } from '../ui/Tabs.jsx';

export default function ReportesNav() {
  return (
    <TabsList as="nav" ariaLabel="Tipos de reportes">
      {[
        { ruta: '/reports', etiqueta: 'Ventas' },
        { ruta: '/reports/rentabilidad', etiqueta: 'Rentabilidad por sucursal' },
      ].map(({ ruta, etiqueta }) => (
        <TabLink key={ruta} to={ruta} end>{etiqueta}</TabLink>
      ))}
    </TabsList>
  );
}
