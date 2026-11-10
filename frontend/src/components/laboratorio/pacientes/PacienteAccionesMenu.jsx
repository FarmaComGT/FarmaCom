import React from 'react';
import { Ban, Pencil, Trash2 } from 'lucide-react';
import MenuAcciones from '../../ui/MenuAcciones.jsx';

export default function PacienteAccionesMenu({ paciente, onEditar, onAnular, onEliminar }) {
  const anulado = paciente.estado === 'anulado';

  return (
    <MenuAcciones
      etiqueta={`Más acciones para ${paciente.nombre_paciente}`}
      acciones={[
        { clave: 'editar', etiqueta: 'Editar', icono: Pencil, deshabilitada: anulado, onClick: () => onEditar(paciente) },
        { clave: 'anular', etiqueta: 'Anular', icono: Ban, peligro: true, oculta: anulado, onClick: () => onAnular(paciente) },
        { clave: 'eliminar', etiqueta: 'Eliminar', icono: Trash2, peligro: true, separadorAntes: true, onClick: () => onEliminar(paciente) },
      ]}
    />
  );
}
