import { ToastProvider } from '../../context/ToastContext.jsx';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pacientes from './Pacientes';

const { mockCrear, mockActualizar, mockAnular, mockEliminar, contexto } = vi.hoisted(() => ({
  contexto: { usuario: { rol: 'laboratorista', id_laboratorio: 1 }, paginacion: null, laboratorios: [] },
  mockCrear: vi.fn(),
  mockActualizar: vi.fn(),
  mockAnular: vi.fn(),
  mockEliminar: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: contexto.usuario }),
}));

vi.mock('../../hooks/useLaboratorios', () => ({
  default: () => ({ laboratorios: contexto.laboratorios, cargando: false, error: null }),
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
    paginacion: contexto.paginacion,
    resumenEstados: { activos: 1, anulados: 0 },
    cargando: false,
    error: null,
    crear: mockCrear,
    actualizar: mockActualizar,
    anular: mockAnular,
    eliminar: mockEliminar,
  }),
}));

const renderizar = () => render(
  <ToastProvider><MemoryRouter>
    <Pacientes />
  </MemoryRouter></ToastProvider>,
);

describe('Pacientes', () => {
  beforeEach(() => {
    contexto.usuario = { id_usuario: 12, rol: 'laboratorista', id_laboratorio: 1 };
    contexto.laboratorios = [];
    contexto.paginacion = { pagina: 1, limite: 20, total: 1, total_paginas: 1 };
    mockCrear.mockReset();
    mockActualizar.mockReset();
    mockAnular.mockReset();
    mockEliminar.mockReset();
  });

  afterEach(() => {
    delete document.startViewTransition;
  });

  it('muestra el listado de pacientes con sus datos', () => {
    renderizar();

    expect(screen.getByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('1234567890101')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
  });

  it('anima y conserva en la URL el filtro de estado seleccionado', async () => {
    const user = userEvent.setup();
    const iniciarTransicion = vi.fn((actualizar) => {
      actualizar();
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: iniciarTransicion,
    });
    renderizar();

    await user.click(screen.getByRole('button', { name: /Activos/ }));

    expect(iniciarTransicion).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /Activos/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('permite la carga inicial sin paginación resuelta', () => {
    contexto.paginacion = null;
    renderizar();
    expect(screen.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
  });

  it('conserva consulta y laboratorio en el enlace al expediente', async () => {
    contexto.usuario = { rol: 'administrador' };
    contexto.laboratorios = [{ id_laboratorio: 1, nombre_laboratorio: 'Central' }, { id_laboratorio: 2, nombre_laboratorio: 'Norte' }];
    render(<ToastProvider><MemoryRouter initialEntries={['/laboratorio/pacientes?q=Ana&laboratorio=2&estado=activo']}><Pacientes /></MemoryRouter></ToastProvider>);
    expect(screen.getByRole('combobox', { name: 'Laboratorio' })).toHaveValue('2');
    const enlace = new URL(screen.getByRole('link', { name: 'Ana López' }).href);
    expect(enlace.searchParams.get('regreso')).toBe('/laboratorio/pacientes?q=Ana&laboratorio=2&estado=activo');
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

    await user.click(screen.getByRole('button', { name: 'Más acciones para Ana López' }));
    await user.click(screen.getByRole('button', { name: 'Anular' }));
    await user.type(screen.getByLabelText(/Motivo/), 'Registro duplicado');
    await user.click(screen.getByRole('button', { name: 'Sí, anular' }));

    expect(mockAnular).toHaveBeenCalledWith(3, 'Registro duplicado');
  });

  it('elimina un paciente tras confirmar la advertencia', async () => {
    mockEliminar.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Más acciones para Ana López' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(screen.getByText('Eliminar paciente')).toBeInTheDocument();
    expect(screen.getByText(/No se puede deshacer/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar definitivamente' }));

    expect(mockEliminar).toHaveBeenCalledWith(3);
  });
});
