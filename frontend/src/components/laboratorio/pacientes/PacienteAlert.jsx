import React from 'react';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';

const ESTILOS = { error: management.alert, success: laboratory.successAlert };

export default function PacienteAlert({ mensaje, variante = 'error' }) {
  if (!mensaje) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className={ESTILOS[variante] || ESTILOS.error}>
      {mensaje}
    </div>
  );
}
