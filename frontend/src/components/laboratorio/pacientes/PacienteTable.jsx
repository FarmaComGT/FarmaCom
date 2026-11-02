import React from 'react';
import PacienteTableHeader from './PacienteTableHeader.jsx';
import PacienteTableRow from './PacienteTableRow.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function PacienteTable({ cargando, pacientes, onEditar, onAnular, onEliminar }) {
  return (
    <section className={styles.tablePanel} aria-label="Pacientes registrados">
      <table className={styles.table} aria-busy={cargando}>
        <PacienteTableHeader />
        <tbody>
          {cargando ? (
            <tr><td colSpan="8" className={styles.loading}>Cargando pacientes…</td></tr>
          ) : pacientes.length === 0 ? (
            <tr><td colSpan="8" className={styles.empty}><strong>No hay pacientes para mostrar.</strong><span>Prueba con otra búsqueda o registra un paciente.</span></td></tr>
          ) : pacientes.map((paciente) => (
            <PacienteTableRow key={paciente.id_paciente} paciente={paciente} onEditar={onEditar} onAnular={onAnular} onEliminar={onEliminar} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
