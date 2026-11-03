import React from 'react';
import { Pencil, Power, Trash2, Phone } from 'lucide-react';
import styles from '../../../styles/ManagementUI.module.css';

export default function CasaTableRow({ casa, onEditar, onCambiarEstado, onContactos, onEliminar, procesando }) {
  return (
    <tr>
      <td data-label="Código" className={`${styles.secondary} ${styles.mono}`}>#{casa.id_casa}</td>
      <th scope="row" data-label="Nombre"><span className={styles.identity}>{casa.nombre}</span></th>
      <td data-label="Estado">
        <span className={`${styles.badge} ${casa.activo ? styles.badgeActive : styles.badgeInactive}`}>
          {casa.activo ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      <td data-label="Acciones" className={styles.actionsCell}>
        <div className={styles.rowActions}>
          <button type="button" onClick={() => onContactos(casa)} className={styles.button} aria-label={`Gestionar contactos de ${casa.nombre}`}>
            <Phone size={15} aria-hidden="true" /> Contactos
          </button>
          <button type="button" onClick={() => onEditar(casa)} className={styles.button} aria-label={`Editar casa farmacéutica ${casa.nombre}`}>
            <Pencil size={15} aria-hidden="true" /> Editar
          </button>
          <button type="button" onClick={() => onCambiarEstado(casa)} disabled={procesando} className={`${styles.button} ${casa.activo ? styles.danger : ''}`} aria-label={`${casa.activo ? 'Desactivar' : 'Activar'} casa farmacéutica ${casa.nombre}`}>
            <Power size={15} aria-hidden="true" /> {casa.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button type="button" onClick={() => onEliminar(casa)} disabled={procesando} aria-label={`Eliminar casa farmacéutica ${casa.nombre}`} className={`${styles.button} ${styles.iconButton} ${styles.danger}`} title="Eliminar">
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}
