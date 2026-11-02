import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

const ESTILOS_ESTADO = { activo: styles.badgeActive, anulado: styles.badgeInactive };

const ETIQUETAS_ESTADO = {
  activo: 'Activo',
  anulado: 'Anulado',
};

export default function PacienteEstadoBadge({ estado }) {
  return (
    <span
      className={`${styles.badge} ${ESTILOS_ESTADO[estado] || ''}`}
    >
      {ETIQUETAS_ESTADO[estado] || estado}
    </span>
  );
}
