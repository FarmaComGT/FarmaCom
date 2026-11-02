import React from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';

export default function PacienteEliminarModal({ isOpen, paciente, eliminando, onClose, onConfirm }) {
  if (!paciente) return null;
  const tituloId = 'titulo-eliminar-paciente';
  const descripcionId = 'descripcion-eliminar-paciente';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} describedBy={descripcionId} onClose={onClose} busy={eliminando} size="small">
      <div className={management.dialogContent}>
        <header className={management.dialogHeader}>
          <div><h2 id={tituloId}>Eliminar paciente</h2><p>Esta operación elimina el expediente completo.</p></div>
          <button type="button" onClick={onClose} disabled={eliminando} className={`${management.button} ${management.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <p id={descripcionId}>Estás a punto de eliminar a <strong>{paciente.nombre_paciente}</strong>. No se puede deshacer.</p>
        <ul className={laboratory.warningList}>
          <li>Se eliminarán el expediente, visitas y resultados de laboratorio.</li>
          <li>Los PDF subidos al servidor se eliminan y los enlaces públicos por QR dejan de funcionar.</li>
          <li>Para conservar el historial, utiliza “Anular” en lugar de eliminar.</li>
        </ul>
        <div className={management.dialogActions}>
          <button type="button" onClick={onClose} disabled={eliminando} className={management.button}>Cancelar</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={eliminando}
            aria-label={eliminando ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
            className={`${management.button} ${management.dangerPrimary}`}
          >
            {eliminando && <LoaderCircle size={15} className={management.spinner} aria-hidden="true" />} Sí, eliminar definitivamente
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
