import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacientePerfil from './PacientePerfil';

const { mockObtenerPaciente, mockSubir, mockAnular, mockUseAuth } = vi.hoisted(() => ({
  mockObtenerPaciente: vi.fn(),
  mockSubir: vi.fn(),
  mockAnular: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('../../api/pacientes', () => ({
  obtenerPaciente: mockObtenerPaciente,
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../components/laboratorio/pacientes/HistorialExpediente.jsx', () => ({
  default: ({ idExpediente }) => <div>Bitácora del expediente {idExpediente}</div>,
}));

vi.mock('../../hooks/useCategoriasSugeridas', () => ({
  default: () => ['Hematología', 'Orina'],
}));

let resultadosSimulados = [];

vi.mock('../../hooks/useResultadosLaboratorio', () => ({
  default: () => ({
    resultados: resultadosSimulados,
    cargando: false,
    error: null,
    subir: mockSubir,
    anular: mockAnular,
  }),
}));

const paciente = {
  id_paciente: 3,
  id_laboratorio: 1,
  nombre_paciente: 'Ana López',
  dpi: '1234567890101',
  edad: 34,
  sexo: 'F',
  telefono: '5555-1111',
  fecha_registro: '2026-01-10T00:00:00.000Z',
  estado: 'activo',
  id_expediente: 8,
};

const renderizar = () => render(
  <MemoryRouter initialEntries={['/laboratorio/pacientes/3']}>
    <Routes>
      <Route path="/laboratorio/pacientes/:id" element={<PacientePerfil />} />
    </Routes>
  </MemoryRouter>,
);

describe('PacientePerfil', () => {
  beforeEach(() => {
    mockObtenerPaciente.mockReset();
    mockObtenerPaciente.mockResolvedValue(paciente);
    mockSubir.mockReset();
    mockAnular.mockReset();
    mockUseAuth.mockReturnValue({ usuario: { rol: 'administrador' } });
    resultadosSimulados = [];
  });

  it('muestra el encabezado del paciente y un estado vacío sin resultados', async () => {
    renderizar();

    expect(await screen.findByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay resultados')).toBeInTheDocument();
  });

  it('muestra las tarjetas de resultados existentes con su categoría y estado de vigencia', async () => {
    resultadosSimulados = [
      {
        id_resultado: 1,
        categoria: 'Hematología',
        fecha_subida: '2026-02-01T00:00:00.000Z',
        estado: 'vigente',
        vigente: true,
        token_publico: 'token-1',
      },
    ];
    renderizar();

    expect(await screen.findByText('Hematología')).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
  });

  it('muestra la bitácora solamente a dueño y administrador', async () => {
    const { unmount } = renderizar();
    expect(await screen.findByText('Bitácora del expediente 8')).toBeInTheDocument();
    unmount();

    mockUseAuth.mockReturnValue({ usuario: { rol: 'laboratorista' } });
    renderizar();
    await screen.findByText('Ana López');
    expect(screen.queryByText('Bitácora del expediente 8')).not.toBeInTheDocument();
  });

  it('sube un nuevo resultado y muestra la alerta de éxito', async () => {
    mockSubir.mockResolvedValue({ id_resultado: 2 });
    const user = userEvent.setup();
    renderizar();

    await screen.findByText('Ana López');
    await user.click(screen.getByRole('button', { name: 'Nuevo resultado' }));
    await user.type(screen.getByLabelText(/Categoría del examen/), 'Orina');

    const archivo = new File(['contenido'], 'resultado.pdf', { type: 'application/pdf' });
    await user.upload(document.querySelector('input[type="file"]'), archivo);
    await user.click(screen.getByRole('button', { name: 'Subir resultado' }));

    expect(mockSubir).toHaveBeenCalledWith({ categoria: 'Orina', archivo });
    expect(await screen.findByText('Resultado subido correctamente.')).toBeInTheDocument();
  });
});
