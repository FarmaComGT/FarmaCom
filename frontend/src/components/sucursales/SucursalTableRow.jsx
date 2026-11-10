import React from 'react';
import { Pencil, Phone, Trash2 } from 'lucide-react';
import styles from '../../styles/ManagementUI.module.css';
import MenuAcciones from '../ui/MenuAcciones.jsx';

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
          <MenuAcciones
            etiqueta={`Más acciones para ${sucursal.nombre_sucursal}`}
            ocupado={eliminando}
            acciones={[
              { clave: 'contactos', etiqueta: 'Contactos', icono: Phone, onClick: () => onContactos(sucursal) },
              { clave: 'editar', etiqueta: 'Editar', icono: Pencil, onClick: () => onEditar(sucursal) },
              { clave: 'eliminar', etiqueta: 'Eliminar', icono: Trash2, peligro: true, separadorAntes: true, onClick: () => onEliminar(sucursal) },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
