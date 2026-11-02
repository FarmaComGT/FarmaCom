import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

const filtros = [
  { estado: 'todos', etiqueta: 'Todos', clave: 'totalPacientes' },
  { estado: 'activo', etiqueta: 'Activos', clave: 'totalActivos' },
  { estado: 'anulado', etiqueta: 'Anulados', clave: 'totalAnulados' },
];

export default function PacienteStatsGrid({ totalPacientes, totalActivos, totalAnulados, estadoSeleccionado, onSeleccionarEstado }) {
  const totales = { totalPacientes, totalActivos, totalAnulados };
  return (
    <div className={styles.quickFilters} role="group" aria-label="Filtrar pacientes por estado">
      {filtros.map(({ estado, etiqueta, clave }) => (
        <button key={estado} type="button" className={styles.quickFilter} aria-pressed={estadoSeleccionado === estado} onClick={() => onSeleccionarEstado(estado)}>
          <strong>{totales[clave]}</strong><span>{etiqueta}</span>
        </button>
      ))}
    </div>
  );
}
