import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacienteFormModal from './PacienteFormModal';

const propsBase = {
  isOpen: true,
  modoEdicion: false,
  paciente: null,
  guardando: false,
  errorFormulario: null,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
};

describe('PacienteFormModal', () => {
  it('envía fecha_nacimiento con edad_manual en null cuando se usa el modo por defecto', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PacienteFormModal {...propsBase} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana López');
    await user.click(screen.getByRole('button', { name: 'Femenino' }));
    await user.type(document.querySelector('input[name="fecha_nacimiento"]'), '1990-01-01');
    await user.click(screen.getByRole('button', { name: 'Guardar paciente' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre_paciente: 'Ana López',
        sexo: 'F',
        fecha_nacimiento: '1990-01-01',
        edad_manual: null,
      }),
    );
  });

  it('envía edad_manual con fecha_nacimiento en null al cambiar de modo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PacienteFormModal {...propsBase} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Nombre completo/), 'Carlos Pérez');
    await user.click(screen.getByRole('button', { name: 'Masculino' }));
    await user.click(screen.getByRole('button', { name: 'Edad manual' }));
    await user.type(screen.getByPlaceholderText('Ej. 45'), '52');
    await user.click(screen.getByRole('button', { name: 'Guardar paciente' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        sexo: 'M',
        fecha_nacimiento: null,
        edad_manual: 52,
      }),
    );
  });

  it('no envía el formulario si falta seleccionar el sexo', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PacienteFormModal {...propsBase} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Nombre completo/), 'Sin Sexo');
    await user.type(document.querySelector('input[name="fecha_nacimiento"]'), '1990-01-01');
    await user.click(screen.getByRole('button', { name: 'Guardar paciente' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Selecciona el sexo del paciente.')).toBeInTheDocument();
  });

  it('precarga el modo edad manual al editar un paciente sin fecha de nacimiento', () => {
    render(
      <PacienteFormModal
        {...propsBase}
        modoEdicion
        paciente={{
          nombre_paciente: 'Luis Gómez',
          sexo: 'M',
          fecha_nacimiento: null,
          edad_manual: 60,
          dpi: null,
          telefono: null,
          direccion: null,
          observaciones: null,
        }}
      />,
    );

    expect(screen.getByPlaceholderText('Ej. 45')).toHaveValue(60);
    expect(screen.getByRole('button', { name: 'Masculino' })).toHaveClass('border-primary');
  });
});
