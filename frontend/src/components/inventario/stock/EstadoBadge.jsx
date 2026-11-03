import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

const ESTADOS = {
  sin_lotes: { label: 'Sin lotes', clase: '' },
  vencido: { label: 'Vencido', clase: styles.badgeDanger },
  agotado: { label: 'Agotado', clase: styles.badgeDanger },
  proximo_a_vencer: { label: 'Próximo a vencer', clase: styles.badgeWarning },
  poco_stock: { label: 'Poco stock', clase: styles.badgeWarning },
  normal: { label: 'En buen estado', clase: styles.badgeActive },
};

export default function EstadoBadge({ estado }) {
  const configuracion = ESTADOS[estado] ?? ESTADOS.normal;
  return <span className={`${styles.badge} ${configuracion.clase}`}>{configuracion.label}</span>;
}
