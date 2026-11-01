import React from 'react';
import { Pencil } from 'lucide-react';
import styles from '../../styles/ManagementUI.module.css';

export default function LaboratorioTable({ cargando, laboratorios, mapaCiudades, onEditar }) {
  return (
    <section className={styles.tablePanel} aria-label="Laboratorios registrados">
      <table className={styles.table} aria-busy={cargando}>
        <thead>
          <tr>
            <th scope="col" style={{ width: '28%' }}>Laboratorio</th>
            <th scope="col" style={{ width: '22%' }}>Ciudad</th>
            <th scope="col">Dirección</th>
            <th scope="col" style={{ width: '18%', textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan="4" className={styles.loading}>Cargando laboratorios…</td></tr>
          ) : laboratorios.length === 0 ? (
            <tr><td colSpan="4" className={styles.empty}>
              <strong>No hay laboratorios para mostrar.</strong>
              <span>Prueba con otra búsqueda o registra un laboratorio.</span>
            </td></tr>
          ) : laboratorios.map((laboratorio) => (
            <tr key={laboratorio.id_laboratorio}>
              <td data-label="Laboratorio"><span className={styles.identity}>{laboratorio.nombre_laboratorio}</span></td>
              <td data-label="Ciudad">{mapaCiudades[laboratorio.id_ciudad] || 'Sin ciudad asignada'}</td>
              <td data-label="Dirección" className={styles.secondary}>{laboratorio.direccion}</td>
              <td data-label="Acciones" className={styles.actionsCell}>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    onClick={() => onEditar(laboratorio)}
                    aria-label={`Editar ${laboratorio.nombre_laboratorio}`}
                    className={styles.button}
                  >
                    <Pencil size={14} aria-hidden="true" /> Editar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
