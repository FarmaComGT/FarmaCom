import React from 'react';
import { Pencil, UserCheck, UserX } from 'lucide-react';
import styles from '../../styles/ManagementUI.module.css';

const ETIQUETAS_ROL = {
  dueno: 'Dueño',
  administrador: 'Administrador',
  dependiente: 'Dependiente',
  laboratorista: 'Laboratorista',
};

const ETIQUETAS_ESTADO = {
  activo: 'Activo',
  inactivo: 'Inactivo',
};

export default function UsuarioTableRow({
  usuario,
  nombreSucursal,
  onEditar,
  onCambiarEstado,
  cambiandoEstado,
  puedeEditar = true,
  puedeCambiarEstado = true,
}) {
  const esActivo = usuario.estado_usuario === 'activo';

  return (
    <tr>
      <td data-label="Nombre"><span className={styles.identity}>{usuario.nombre_usuario}</span></td>
      <td data-label="Correo" className={styles.secondary}>{usuario.correo_usuario}</td>
      <td data-label="Rol">{ETIQUETAS_ROL[usuario.rol] || usuario.rol}</td>
      <td data-label="Sucursal" className={styles.secondary}>{nombreSucursal}</td>
      <td data-label="Estado">
        <span style={{ whiteSpace: 'nowrap', justifySelf: 'start' }} className={`${styles.badge} ${esActivo ? styles.badgeActive : styles.badgeInactive}`}>
          {ETIQUETAS_ESTADO[usuario.estado_usuario] || usuario.estado_usuario || 'Sin estado'}
        </span>
      </td>
      <td data-label="Acciones" className={styles.actionsCell}>
        <div className={styles.rowActions} style={{ flexWrap: 'wrap' }}>
          {puedeEditar && <button
            type="button"
            onClick={() => onEditar(usuario)}
            className={styles.button}
          >
            <Pencil size={14} aria-hidden="true" />
            Editar
          </button>}
          {puedeCambiarEstado && <button
            type="button"
            onClick={() => onCambiarEstado(usuario)}
            disabled={cambiandoEstado}
            className={`${styles.button} ${esActivo ? styles.danger : ''}`}
          >
            {esActivo ? (
              <UserX size={14} aria-hidden="true" />
            ) : (
              <UserCheck size={14} aria-hidden="true" />
            )}
            {cambiandoEstado ? 'Guardando…' : esActivo ? 'Desactivar' : 'Activar'}
          </button>}
        </div>
      </td>
    </tr>
  );
}
