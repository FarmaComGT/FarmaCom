import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacientePerfil from './PacientePerfil';

const {
  mockObtenerPaciente, mockSubir, mockAnular, mockUseAuth, mockUseAlmacenamientoLocal,
} = vi.hoisted(() => ({
  mockObtenerPaciente: vi.fn(),
  mockSubir: vi.fn(),
  mockAnular: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseAlmacenamientoLocal: vi.fn(),
}));

vi.mock('../../api/pacientes', () => ({
  obtenerPaciente: mockObtenerPaciente,
}));

vi.mock('../../api/resultadosLaboratorio', () => ({
  construirUrlPublica: (token) => `http://localhost:3000/api/resultados-laboratorio/publico/${token}`,
}));

vi.mock('../../hooks/useAlmacenamientoLocal', () => ({
  default: mockUseAlmacenamientoLocal,
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

    mockUseAlmacenamientoLocal.mockReset();
    mockUseAlmacenamientoLocal.mockReturnValue({
      soportado: true,
      carpetaConfigurada: true,
      permisoOk: true,
      elegirCarpeta: vi.fn(),
      reconectar: vi.fn(),
      guardarRespaldo: vi.fn().mockResolvedValue(true),
      respaldosDe: vi.fn().mockResolvedValue([]),
      abrirArchivoLocal: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(0) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('guarda un respaldo local del resultado recién subido', async () => {
    const guardarRespaldo = vi.fn().mockResolvedValue(true);
    mockUseAlmacenamientoLocal.mockReturnValue({
      soportado: true,
      carpetaConfigurada: true,
      permisoOk: true,
      elegirCarpeta: vi.fn(),
      reconectar: vi.fn(),
      guardarRespaldo,
      respaldosDe: vi.fn().mockResolvedValue([]),
      abrirArchivoLocal: vi.fn(),
    });
    mockSubir.mockResolvedValue({ id_resultado: 2, token_publico: 'token-2', categoria: 'Orina' });
    const user = userEvent.setup();
    renderizar();

    await screen.findByText('Ana López');
    await user.click(screen.getByRole('button', { name: 'Nuevo resultado' }));
    await user.type(screen.getByLabelText(/Categoría del examen/), 'Orina');
    const archivo = new File(['contenido'], 'resultado.pdf', { type: 'application/pdf' });
    await user.upload(document.querySelector('input[type="file"]'), archivo);
    await user.click(screen.getByRole('button', { name: 'Subir resultado' }));

    await screen.findByText('Resultado subido correctamente.');
    expect(guardarRespaldo).toHaveBeenCalledWith(
      paciente,
      { id_resultado: 2, token_publico: 'token-2', categoria: 'Orina' },
      expect.any(ArrayBuffer),
    );
  });

  it('bloquea la subida y explica por qué si no hay carpeta local configurada', async () => {
    mockUseAlmacenamientoLocal.mockReturnValue({
      soportado: true,
      carpetaConfigurada: false,
      permisoOk: false,
      elegirCarpeta: vi.fn(),
      reconectar: vi.fn(),
      guardarRespaldo: vi.fn(),
      respaldosDe: vi.fn().mockResolvedValue([]),
      abrirArchivoLocal: vi.fn(),
    });
    const user = userEvent.setup();
    renderizar();

    await screen.findByText('Ana López');
    await user.click(screen.getByRole('button', { name: 'Nuevo resultado' }));

    expect(screen.getByText('Configura el respaldo local')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoría del examen/)).not.toBeInTheDocument();
    expect(mockSubir).not.toHaveBeenCalled();
  });
});
