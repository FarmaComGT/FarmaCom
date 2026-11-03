import React from 'react';
import CasaTableHeader from './CasaTableHeader.jsx';
import CasaTableRow from './CasaTableRow.jsx';
import ContentState from '../../ui/ContentState.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function CasaTable({ cargando, error, casas, hayFiltros, onRetry, onEditar, onCambiarEstado, onContactos, onEliminar, procesandoId }) {
  if (cargando && casas.length === 0) return <ContentState variant="loading" message="Cargando casas farmacéuticas…" />;
  if (error && casas.length === 0) return <ContentState variant="error" title="No se pudieron cargar las casas farmacéuticas" message={error} onRetry={onRetry} />;
  if (casas.length === 0) {
    return <ContentState title={hayFiltros ? 'Sin coincidencias' : 'Aún no hay casas farmacéuticas'} message={hayFiltros ? 'Prueba con otra búsqueda o cambia el filtro de estado.' : 'Registra la primera casa farmacéutica para comenzar.'} />;
  }

  return (
    <section className={styles.tablePanel} aria-label="Casas farmacéuticas registradas">
      <table className={styles.table} aria-busy={cargando}>
        <caption className={styles.visuallyHidden}>Listado de casas farmacéuticas</caption>
        <thead><CasaTableHeader /></thead>
        <tbody>
          {casas.map((casa) => (
            <CasaTableRow key={casa.id_casa} casa={casa} onEditar={onEditar} onCambiarEstado={onCambiarEstado} onContactos={onContactos} onEliminar={onEliminar} procesando={procesandoId === casa.id_casa} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
