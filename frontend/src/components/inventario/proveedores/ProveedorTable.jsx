import React from 'react';
import ContentState from '../../ui/ContentState.jsx';
import ProveedorTableHeader from './ProveedorTableHeader.jsx';
import ProveedorTableRow from './ProveedorTableRow.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProveedorTable({ cargando, error, proveedores, hayFiltros, onRetry, onEditar, onCambiarEstado, onContactos, onEliminar, procesandoId }) {
  if (cargando && proveedores.length === 0) return <ContentState variant="loading" message="Cargando proveedores…" />;
  if (error && proveedores.length === 0) return <ContentState variant="error" title="No se pudieron cargar los proveedores" message={error} onRetry={onRetry} />;
  if (proveedores.length === 0) return <ContentState title={hayFiltros ? 'Sin coincidencias' : 'Aún no hay proveedores'} message={hayFiltros ? 'Prueba con otra búsqueda o cambia el filtro de estado.' : 'Registra el primer proveedor para comenzar.'} />;

  return (
    <section className={styles.tablePanel} aria-label="Proveedores registrados">
      <table className={styles.table} aria-busy={cargando}>
        <caption className={styles.visuallyHidden}>Listado de proveedores</caption>
        <thead><ProveedorTableHeader /></thead>
        <tbody>
          {proveedores.map((proveedor) => <ProveedorTableRow key={proveedor.id_proveedor} proveedor={proveedor} onEditar={onEditar} onCambiarEstado={onCambiarEstado} onContactos={onContactos} onEliminar={onEliminar} procesando={procesandoId === proveedor.id_proveedor} />)}
        </tbody>
      </table>
    </section>
  );
}
