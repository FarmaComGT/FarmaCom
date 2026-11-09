import React from 'react';
import { TabsList, TabButton } from '../ui/Tabs.jsx';

const filtros = [
  { estado: 'todos', etiqueta: 'Todos' },
  { estado: 'activo', etiqueta: 'Activos' },
  { estado: 'inactivo', etiqueta: 'Inactivos' },
];

export default function UsuarioStatsGrid({ estadoSeleccionado, onSeleccionarEstado }) {
  return (
    <TabsList ariaLabel="Filtrar usuarios por estado">
      {filtros.map(({ estado, etiqueta }) => (
        <TabButton key={estado} active={estadoSeleccionado === estado} onClick={() => onSeleccionarEstado(estado)}>
          {etiqueta}
        </TabButton>
      ))}
    </TabsList>
  );
}
