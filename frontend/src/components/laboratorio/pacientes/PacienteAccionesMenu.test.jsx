import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacienteAccionesMenu from './PacienteAccionesMenu';

const pacienteActivo = { id_paciente: 1, nombre_paciente: 'Ana López', estado: 'activo' };
const pacienteAnulado = { id_paciente: 2, nombre_paciente: 'Luis Gómez', estado: 'anulado' };

describe('PacienteAccionesMenu', () => {
  it('el menú está cerrado hasta hacer clic en el botón de más acciones', () => {
    render(<PacienteAccionesMenu paciente={pacienteActivo} onEditar={vi.fn()} onAnular={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('muestra Editar y Anular para un paciente activo, y los invoca al hacer clic', async () => {
    const user = userEvent.setup();
    const onEditar = vi.fn();
    const onAnular = vi.fn();
    render(<PacienteAccionesMenu paciente={pacienteActivo} onEditar={onEditar} onAnular={onAnular} />);

    await user.click(screen.getByRole('button', { name: 'Más acciones para Ana López' }));
    expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Anular' }));
    expect(onAnular).toHaveBeenCalledWith(pacienteActivo);

    await user.click(screen.getByRole('button', { name: 'Más acciones para Ana López' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEditar).toHaveBeenCalledWith(pacienteActivo);
  });

  it('deshabilita Editar y oculta Anular para un paciente anulado', async () => {
    const user = userEvent.setup();
    render(<PacienteAccionesMenu paciente={pacienteAnulado} onEditar={vi.fn()} onAnular={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Más acciones para Luis Gómez' }));

    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
  });

  it('cierra el menú después de elegir una acción', async () => {
    const user = userEvent.setup();
    render(<PacienteAccionesMenu paciente={pacienteActivo} onEditar={vi.fn()} onAnular={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Más acciones para Ana López' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });
});
