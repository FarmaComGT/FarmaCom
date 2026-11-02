import React from 'react';
import SucursalTableHeader from './SucursalTableHeader.jsx';
import SucursalTableRow from './SucursalTableRow.jsx';
import styles from '../../styles/ManagementUI.module.css';

export default function SucursalTable({
  cargando,
  sucursales,
  mapaCiudades,
  onEditar,
  onEliminar,
  onContactos,
  eliminandoId,
}) {
  return (
    <section className={styles.tablePanel} aria-label="Sucursales registradas">
      <table className={styles.table} aria-busy={cargando}>
        <thead><SucursalTableHeader /></thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan="4" className={styles.loading}>Cargando sucursales…</td></tr>
          ) : sucursales.length === 0 ? (
            <tr><td colSpan="4" className={styles.empty}>
              <strong>No hay sucursales para mostrar.</strong>
              <span>Prueba con otra búsqueda o registra una sucursal.</span>
            </td></tr>
          ) : sucursales.map((sucursal) => (
            <SucursalTableRow
              key={sucursal.id_sucursal}
              sucursal={sucursal}
              nombreCiudad={mapaCiudades[sucursal.id_ciudad] || `Ciudad #${sucursal.id_ciudad}`}
              onEditar={onEditar}
              onEliminar={onEliminar}
              onContactos={onContactos}
              eliminando={eliminandoId === sucursal.id_sucursal}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}
