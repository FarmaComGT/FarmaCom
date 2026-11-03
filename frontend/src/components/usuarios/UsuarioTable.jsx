import React from 'react';
import UsuarioTableHeader from './UsuarioTableHeader.jsx';
import UsuarioTableRow from './UsuarioTableRow.jsx';
import styles from '../../styles/ManagementUI.module.css';

export default function UsuarioTable({
  cargando,
  usuarios,
  mapaSucursales,
  onEditar,
  onCambiarEstado,
  cambiandoEstadoId,
  puedeEditar,
  puedeCambiarEstado,
}) {
  return (
    <section className={styles.tablePanel} aria-label="Usuarios registrados">
      <table className={styles.table} aria-busy={cargando}>
        <thead><UsuarioTableHeader /></thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan="6" className={styles.loading}>Cargando usuarios…</td></tr>
          ) : usuarios.length === 0 ? (
            <tr><td colSpan="6" className={styles.empty}>
              <strong>No hay usuarios para mostrar.</strong>
              <span>Prueba con otra búsqueda o registra un usuario.</span>
            </td></tr>
          ) : (
            <>
              {usuarios.map((usuario) => (
                <UsuarioTableRow
                  key={usuario.id_usuario}
                  usuario={usuario}
                  nombreSucursal={mapaSucursales[usuario.id_sucursal] || `Sucursal #${usuario.id_sucursal}`}
                  onEditar={onEditar}
                  onCambiarEstado={onCambiarEstado}
                  cambiandoEstado={cambiandoEstadoId === usuario.id_usuario}
                  puedeEditar={puedeEditar(usuario)}
                  puedeCambiarEstado={puedeCambiarEstado}
                />
              ))}
            </>
          )}
        </tbody>
      </table>
    </section>
  );
}
