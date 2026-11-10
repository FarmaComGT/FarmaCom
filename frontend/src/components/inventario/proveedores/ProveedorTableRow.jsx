import React from 'react';
import { Pencil, Phone, Power, Trash2 } from 'lucide-react';
import styles from '../../../styles/ManagementUI.module.css';
import MenuAcciones from '../../ui/MenuAcciones.jsx';

export default function ProveedorTableRow({ proveedor, onEditar, onCambiarEstado, onContactos, onEliminar, procesando }) {
  return (
    <tr>
      <td data-label="Código" className={`${styles.secondary} ${styles.mono}`}>#{proveedor.id_proveedor}</td>
      <th scope="row" data-label="Nombre"><span className={styles.identity}>{proveedor.nombre}</span></th>
      <td data-label="Estado"><span className={`${styles.badge} ${proveedor.activo ? styles.badgeActive : styles.badgeInactive}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td data-label="Acciones" className={styles.actionsCell}>
        <div className={styles.rowActions}>
          <MenuAcciones
            etiqueta={`Más acciones para ${proveedor.nombre}`}
            acciones={[
              { clave: 'contactos', etiqueta: 'Contactos', icono: Phone, onClick: () => onContactos(proveedor) },
              { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onClick: () => onEditar(proveedor) },
              { clave: 'estado', etiqueta: proveedor.activo ? 'Desactivar' : 'Activar', icono: Power, peligro: proveedor.activo, deshabilitada: procesando, onClick: () => onCambiarEstado(proveedor) },
              { clave: 'eliminar', etiqueta: 'Eliminar', icono: Trash2, peligro: true, separadorAntes: true, deshabilitada: procesando, onClick: () => onEliminar(proveedor) },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
