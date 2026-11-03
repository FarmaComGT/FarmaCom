import React from 'react';
import CategoriaTableHeader from './CategoriaTableHeader.jsx';
import CategoriaTableRow from './CategoriaTableRow.jsx';
import ContentState from '../../ui/ContentState.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function CategoriaTable({ cargando, error, categorias, hayBusqueda, onRetry, onEditar, onEliminar, eliminandoId }) {
  if (cargando && categorias.length === 0) {
    return <ContentState variant="loading" message="Cargando categorías…" />;
  }
  if (error && categorias.length === 0) {
    return <ContentState variant="error" title="No se pudieron cargar las categorías" message={error} onRetry={onRetry} />;
  }
  if (categorias.length === 0) {
    return (
      <ContentState
        title={hayBusqueda ? 'Sin coincidencias' : 'Aún no hay categorías'}
        message={hayBusqueda ? 'Prueba con otro nombre o limpia la búsqueda.' : 'Crea la primera categoría para organizar el catálogo.'}
      />
    );
  }

  return (
    <section className={styles.tablePanel} aria-label="Categorías registradas">
      <table className={styles.table} aria-busy={cargando}>
        <caption className={styles.visuallyHidden}>Listado de categorías del catálogo</caption>
        <thead><CategoriaTableHeader /></thead>
        <tbody>
          {categorias.map((categoria) => (
            <CategoriaTableRow
              key={categoria.id_categoria}
              categoria={categoria}
              onEditar={onEditar}
              onEliminar={onEliminar}
              eliminando={eliminandoId === categoria.id_categoria}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}
