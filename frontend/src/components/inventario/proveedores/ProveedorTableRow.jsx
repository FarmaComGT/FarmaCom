import React from 'react';
import { Pencil, Phone, Power, Trash2 } from 'lucide-react';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProveedorTableRow({ proveedor, onEditar, onCambiarEstado, onContactos, onEliminar, procesando }) {
  return (
    <tr>
      <td data-label="Código" className={`${styles.secondary} ${styles.mono}`}>#{proveedor.id_proveedor}</td>
      <th scope="row" data-label="Nombre"><span className={styles.identity}>{proveedor.nombre}</span></th>
      <td data-label="Estado"><span className={`${styles.badge} ${proveedor.activo ? styles.badgeActive : styles.badgeInactive}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td data-label="Acciones" className={styles.actionsCell}>
        <div className={styles.rowActions}>
          <button type="button" onClick={() => onContactos(proveedor)} className={styles.button} aria-label={`Gestionar contactos de ${proveedor.nombre}`}><Phone size={15} aria-hidden="true" />Contactos</button>
          <button type="button" onClick={() => onEditar(proveedor)} className={styles.button} aria-label={`Editar proveedor ${proveedor.nombre}`}><Pencil size={15} aria-hidden="true" />Editar</button>
          <button type="button" onClick={() => onCambiarEstado(proveedor)} disabled={procesando} className={`${styles.button} ${proveedor.activo ? styles.danger : ''}`} aria-label={`${proveedor.activo ? 'Desactivar' : 'Activar'} proveedor ${proveedor.nombre}`}><Power size={15} aria-hidden="true" />{proveedor.activo ? 'Desactivar' : 'Activar'}</button>
          <button type="button" onClick={() => onEliminar(proveedor)} disabled={procesando} aria-label={`Eliminar proveedor ${proveedor.nombre}`} className={`${styles.button} ${styles.iconButton} ${styles.danger}`} title="Eliminar"><Trash2 size={15} aria-hidden="true" /></button>
        </div>
      </td>
    </tr>
  );
}
