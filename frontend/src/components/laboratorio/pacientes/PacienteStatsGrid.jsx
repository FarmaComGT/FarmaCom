import React from 'react';
import { TabsList, TabButton } from '../../ui/Tabs.jsx';

const filtros = [
  { estado: 'todos', etiqueta: 'Todos' },
  { estado: 'activo', etiqueta: 'Activos' },
  { estado: 'anulado', etiqueta: 'Anulados' },
];

export default function PacienteStatsGrid({ estadoSeleccionado, onSeleccionarEstado }) {
  return (
    <TabsList ariaLabel="Filtrar pacientes por estado">
      {filtros.map(({ estado, etiqueta }) => (
        <TabButton key={estado} active={estadoSeleccionado === estado} onClick={() => onSeleccionarEstado(estado)}>
          {etiqueta}
        </TabButton>
      ))}
    </TabsList>
  );
}
