import React from 'react';
import styles from '../../styles/ManagementUI.module.css';

const filtros = [
  { estado: 'todos', etiqueta: 'Todos', totalProp: 'totalUsuarios' },
  { estado: 'activo', etiqueta: 'Activos', totalProp: 'totalActivos' },
  { estado: 'inactivo', etiqueta: 'Inactivos', totalProp: 'totalInactivos' },
];

export default function UsuarioStatsGrid({
  totalUsuarios,
  totalActivos,
  totalInactivos,
  estadoSeleccionado,
  onSeleccionarEstado,
}) {
  const totales = { totalUsuarios, totalActivos, totalInactivos };

  return (
    <div className={styles.quickFilters} role="group" aria-label="Filtrar usuarios por estado">
      {filtros.map(({ estado, etiqueta, totalProp }) => (
        <button
          key={estado}
          type="button"
          className={styles.quickFilter}
          aria-pressed={estadoSeleccionado === estado}
          onClick={() => onSeleccionarEstado(estado)}
        >
          {totales[totalProp] != null && <strong>{totales[totalProp]}</strong>}
          <span>{etiqueta}</span>
        </button>
      ))}
    </div>
  );
}
