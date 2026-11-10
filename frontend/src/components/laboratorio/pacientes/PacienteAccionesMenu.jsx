import React, { useRef, useState } from 'react';
import { Ban, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';
import MenuFlotante from '../../ui/MenuFlotante.jsx';

export default function PacienteAccionesMenu({ paciente, onEditar, onAnular, onEliminar }) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef(null);
  const anulado = paciente.estado === 'anulado';
  const idMenu = `acciones-paciente-${paciente.id_paciente}`;

  const cerrar = () => setAbierto(false);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-label={`Más acciones para ${paciente.nombre_paciente}`}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={idMenu}
        className={`${management.button} ${management.iconButton}`}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      <MenuFlotante anclaRef={botonRef} abierto={abierto} onCerrar={cerrar} id={idMenu}>
        <button
          type="button"
          disabled={anulado}
          onClick={() => {
            cerrar();
            onEditar(paciente);
          }}
          className={laboratory.menuItem}
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
        {!anulado && (
          <button
            type="button"
            onClick={() => {
              cerrar();
              onAnular(paciente);
            }}
            className={`${laboratory.menuItem} ${laboratory.menuDanger}`}
          >
            <Ban className="h-3.5 w-3.5" /> Anular
          </button>
        )}
        <div className={laboratory.menuSeparator} />
        <button
          type="button"
          onClick={() => {
            cerrar();
            onEliminar(paciente);
          }}
          className={`${laboratory.menuItem} ${laboratory.menuDanger}`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </button>
      </MenuFlotante>
    </>
  );
}
