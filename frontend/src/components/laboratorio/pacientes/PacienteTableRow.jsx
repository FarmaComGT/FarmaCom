import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PacienteEstadoBadge from './PacienteEstadoBadge.jsx';
import PacienteAccionesMenu from './PacienteAccionesMenu.jsx';
import { navegarConTransicionDeVista } from '../../../utils/viewTransition';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';

const ETIQUETAS_SEXO = { M: 'M', F: 'F', Otro: 'Otro' };
const formatearFecha = (fecha) => (fecha ? new Intl.DateTimeFormat('es-GT').format(new Date(fecha)) : '—');

export default function PacienteTableRow({ paciente, onEditar, onAnular, onEliminar }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const destino = `/laboratorio/pacientes/${paciente.id_paciente}`;

  return (
    <tr>
      <td data-label="Paciente">
        <Link
          to={destino}
          onClick={(event) => navegarConTransicionDeVista({
            event,
            navigate,
            destino,
            rutaActual: pathname,
          })}
          className={laboratory.patientLink}
        >
          {paciente.nombre_paciente}
        </Link>
      </td>
      <td data-label="DPI" className={`${management.secondary} ${management.mono}`}>{paciente.dpi || '—'}</td>
      <td data-label="Edad" className={management.secondary}>{paciente.edad ?? '—'}</td>
      <td data-label="Sexo" className={management.secondary}>{ETIQUETAS_SEXO[paciente.sexo] || paciente.sexo}</td>
      <td data-label="Teléfono" className={management.secondary}>{paciente.telefono || '—'}</td>
      <td data-label="Registro" className={management.secondary}>{formatearFecha(paciente.fecha_registro)}</td>
      <td data-label="Estado"><PacienteEstadoBadge estado={paciente.estado} /></td>
      <td data-label="Acciones" className={management.actionsCell}>
        <PacienteAccionesMenu paciente={paciente} onEditar={onEditar} onAnular={onAnular} onEliminar={onEliminar} />
      </td>
    </tr>
  );
}
