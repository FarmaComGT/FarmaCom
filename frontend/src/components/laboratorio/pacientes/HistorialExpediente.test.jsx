import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistorialExpediente from './HistorialExpediente';

const { mockUseHistorial } = vi.hoisted(() => ({ mockUseHistorial: vi.fn() }));

vi.mock('../../../hooks/useHistorialExpediente', () => ({
  default: mockUseHistorial,
}));

describe('HistorialExpediente', () => {
  beforeEach(() => {
    mockUseHistorial.mockReturnValue({
      historial: [],
      cargando: false,
      error: null,
      recargar: vi.fn(),
    });
  });

  it('muestra quién, cuándo y los valores que cambiaron', () => {
    mockUseHistorial.mockReturnValue({
      historial: [{
        id_bitacora: 1,
        id_usuario: 9,
        nombre_usuario: 'Administradora General',
        entidad: 'paciente',
        accion: 'actualizar',
        fecha_hora: '2026-10-05T16:30:00Z',
        valores_anteriores: { telefono: '1111' },
        valores_nuevos: { telefono: '2222' },
      }],
      cargando: false,
      error: null,
      recargar: vi.fn(),
    });

    render(<HistorialExpediente idExpediente={7} />);

    expect(screen.getByText('Administradora General')).toBeInTheDocument();
    expect(screen.getByText('Teléfono:')).toBeInTheDocument();
    expect(screen.getByText('1111')).toBeInTheDocument();
    expect(screen.getByText('2222')).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no existen cambios', () => {
    render(<HistorialExpediente idExpediente={7} />);
    expect(screen.getByText(/Todavía no hay cambios registrados/)).toBeInTheDocument();
  });
});
