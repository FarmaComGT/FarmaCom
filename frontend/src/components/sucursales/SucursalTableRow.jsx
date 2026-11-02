import React from 'react';
import { Pencil, Phone, Trash2 } from 'lucide-react';
import styles from '../../styles/ManagementUI.module.css';

export default function SucursalTableRow({
  sucursal,
  nombreCiudad,
  onEditar,
  onEliminar,
  onContactos,
  eliminando,
}) {
  return (
    <tr>
      <td data-label="Sucursal"><span className={styles.identity}>{sucursal.nombre_sucursal}</span></td>
      <td data-label="Ciudad">{nombreCiudad}</td>
      <td data-label="Dirección" className={styles.secondary}>{sucursal.direccion}</td>
      <td data-label="Acciones" className={styles.actionsCell}>
        <div className={styles.rowActions}>
          <button type="button" onClick={() => onContactos(sucursal)} className={styles.button}>
            <Phone size={14} aria-hidden="true" /> Contactos
          </button>
          <button type="button" onClick={() => onEditar(sucursal)} className={styles.button}>
            <Pencil size={14} aria-hidden="true" /> Editar
          </button>
          <button type="button" onClick={() => onEliminar(sucursal)} disabled={eliminando} className={`${styles.button} ${styles.danger}`}>
            <Trash2 size={14} aria-hidden="true" /> {eliminando ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </td>
    </tr>
  );
}
