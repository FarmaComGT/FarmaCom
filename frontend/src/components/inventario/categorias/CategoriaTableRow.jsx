import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import styles from '../../../styles/ManagementUI.module.css';

export default function CategoriaTableRow({ categoria, onEditar, onEliminar, eliminando }) {
  return (
    <tr>
      <td data-label="Código" className={`${styles.secondary} ${styles.mono}`}>#{categoria.id_categoria}</td>
      <th scope="row" data-label="Nombre"><span className={styles.identity}>{categoria.nombre}</span></th>
      <td data-label="Acciones" className={styles.actionsCell}>
        <div className={styles.rowActions}>
        <button
          type="button"
          onClick={() => onEditar(categoria)}
          className={styles.button}
          aria-label={`Editar categoría ${categoria.nombre}`}
        >
          <Pencil size={15} aria-hidden="true" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onEliminar(categoria)}
          disabled={eliminando}
          className={`${styles.button} ${styles.danger}`}
          aria-label={`Eliminar categoría ${categoria.nombre}`}
        >
          <Trash2 size={15} aria-hidden="true" />
          Eliminar
        </button>
        </div>
      </td>
    </tr>
  );
}
