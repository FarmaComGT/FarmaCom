import React from 'react';
import { Pencil, Power, Trash2, Phone } from 'lucide-react';
import styles from '../../../styles/ManagementUI.module.css';
import MenuAcciones from '../../ui/MenuAcciones.jsx';

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
          <MenuAcciones
            etiqueta={`Más acciones para ${casa.nombre}`}
            acciones={[
              { clave: 'contactos', etiqueta: 'Contactos', icono: Phone, onClick: () => onContactos(casa) },
              { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onClick: () => onEditar(casa) },
              { clave: 'estado', etiqueta: casa.activo ? 'Desactivar' : 'Activar', icono: Power, peligro: casa.activo, deshabilitada: procesando, onClick: () => onCambiarEstado(casa) },
              { clave: 'eliminar', etiqueta: 'Eliminar', icono: Trash2, peligro: true, separadorAntes: true, deshabilitada: procesando, onClick: () => onEliminar(casa) },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
