import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacienteEliminarModal from './PacienteEliminarModal';

const paciente = { id_paciente: 1, nombre_paciente: 'Ana López' };

describe('PacienteEliminarModal', () => {
  it('no renderiza nada si está cerrado', () => {
    render(
      <PacienteEliminarModal
        isOpen={false}
        paciente={paciente}
        eliminando={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByText('Eliminar paciente')).not.toBeInTheDocument();
  });

  it('muestra el nombre del paciente y advierte sobre los riesgos de eliminar', () => {
    render(
      <PacienteEliminarModal
        isOpen
        paciente={paciente}
        eliminando={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Eliminar paciente')).toBeInTheDocument();
    expect(screen.getByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText(/No se puede deshacer/)).toBeInTheDocument();
    expect(screen.getByText(/PDF subidos al servidor se eliminan/)).toBeInTheDocument();
  });

  it('invoca onConfirm al confirmar y onClose al cancelar', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <PacienteEliminarModal
        isOpen
        paciente={paciente}
        eliminando={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar definitivamente' }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('deshabilita las acciones mientras está eliminando', () => {
    render(
      <PacienteEliminarModal
        isOpen
        paciente={paciente}
        eliminando
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Eliminando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
