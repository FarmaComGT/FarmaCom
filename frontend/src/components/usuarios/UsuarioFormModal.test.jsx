import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UsuarioFormModal from './UsuarioFormModal.jsx';

const sucursales = [{ id_sucursal: 1, nombre_sucursal: 'Central' }];
const laboratorios = [{ id_laboratorio: 2, nombre_laboratorio: 'Laboratorio Central' }];

function ModalConEstado() {
  const [formulario, setFormulario] = useState({
    nombre_usuario: '',
    correo_usuario: '',
    contrasena: '',
    rol: '',
    id_sucursal: '',
    id_laboratorio: '',
  });

  return (
    <UsuarioFormModal
      isOpen
      modoEdicion={false}
      formulario={formulario}
      sucursales={sucursales}
      cargandoSucursales={false}
      laboratorios={laboratorios}
      cargandoLaboratorios={false}
      guardando={false}
      errorFormulario={null}
      onClose={vi.fn()}
      onSubmit={(event) => event.preventDefault()}
      onChange={(event) => setFormulario((actual) => ({
        ...actual,
        [event.target.name]: event.target.value,
      }))}
    />
  );
}

describe('UsuarioFormModal', () => {
  it('solicita un laboratorio solo para el rol laboratorista', () => {
    render(<ModalConEstado />);

    expect(screen.queryByLabelText('Laboratorio')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'laboratorista' } });

    const selectorLaboratorio = screen.getByLabelText('Laboratorio');
    expect(selectorLaboratorio).toBeRequired();
    expect(screen.getByRole('option', { name: 'Laboratorio Central' })).toBeInTheDocument();
  });
});
