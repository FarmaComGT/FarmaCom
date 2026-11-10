import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import styles from '../../../styles/ManagementUI.module.css';
import MenuAcciones from '../../ui/MenuAcciones.jsx';

export default function CategoriaTableRow({ categoria, onEditar, onEliminar, eliminando }) {
  return (
    <tr>
      <td data-label="Código" className={`${styles.secondary} ${styles.mono}`}>#{categoria.id_categoria}</td>
      <th scope="row" data-label="Nombre"><span className={styles.identity}>{categoria.nombre}</span></th>
      <td data-label="Acciones" className={styles.actionsCell}>
        <div className={styles.rowActions}>
          <MenuAcciones
            etiqueta={`Más acciones para ${categoria.nombre}`}
            acciones={[
              { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onClick: () => onEditar(categoria) },
              { clave: 'eliminar', etiqueta: 'Eliminar', icono: Trash2, peligro: true, separadorAntes: true, deshabilitada: eliminando, onClick: () => onEliminar(categoria) },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
