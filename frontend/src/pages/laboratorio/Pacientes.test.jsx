import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pacientes from './Pacientes';

const { mockCrear, mockActualizar, mockAnular } = vi.hoisted(() => ({
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
  mockAnular: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { id_usuario: 12, rol: 'laboratorista', id_laboratorio: 1 } }),
}));

vi.mock('../../hooks/useLaboratorios', () => ({
  default: () => ({ laboratorios: [], cargando: false, error: null }),
}));

vi.mock('../../hooks/usePacientes', () => ({
  default: () => ({
    pacientes: [
      {
        id_paciente: 3,
        nombre_paciente: 'Ana López',
        dpi: '1234567890101',
        edad: 34,
        sexo: 'F',
        telefono: '5555-1111',
        fecha_registro: '2026-01-10T00:00:00.000Z',
        estado: 'activo',
        fecha_nacimiento: '1990-05-14',
        edad_manual: null,
      },
    ],
    paginacion: { pagina: 1, limite: 20, total: 1, total_paginas: 1 },
    resumenEstados: { activos: 1, anulados: 0 },
    cargando: false,
    error: null,
    crear: mockCrear,
    actualizar: mockActualizar,
    anular: mockAnular,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Pacientes />
  </MemoryRouter>,
);

describe('Pacientes', () => {
  beforeEach(() => {
    mockCrear.mockReset();
    mockActualizar.mockReset();
    mockAnular.mockReset();
  });

  it('muestra el listado de pacientes con sus datos', () => {
    renderizar();

    expect(screen.getByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('1234567890101')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
  });

  it('crea un paciente desde el formulario', async () => {
    mockCrear.mockResolvedValue({ id_paciente: 9 });
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo paciente' }));
    await user.type(screen.getByLabelText(/Nombre completo/), 'Carlos Pérez');
    await user.click(screen.getByRole('button', { name: 'Masculino' }));
    await user.click(screen.getByRole('button', { name: 'Edad manual' }));
    await user.type(screen.getByPlaceholderText('Ej. 45'), '40');
    await user.click(screen.getByRole('button', { name: 'Guardar paciente' }));

    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({ nombre_paciente: 'Carlos Pérez', sexo: 'M', edad_manual: 40 }),
    );
  });

  it('anula un paciente con motivo', async () => {
    mockAnular.mockResolvedValue({ id_paciente: 3, estado: 'anulado' });
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Anular Ana López' }));
    await user.type(screen.getByLabelText(/Motivo/), 'Registro duplicado');
    await user.click(screen.getByRole('button', { name: 'Sí, anular' }));

    expect(mockAnular).toHaveBeenCalledWith(3, 'Registro duplicado');
  });
});
