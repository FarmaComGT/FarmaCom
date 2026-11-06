import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ReportesNav from './ReportesNav';
const auth = vi.hoisted(() => ({ rol: 'dueno' }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ usuario: { rol: auth.rol } }) }));
describe('Navegación de reportes', () => {
  it('reserva las pestañas para consultas y separa el envío por correo', () => {
    auth.rol = 'dueno';
    render(<MemoryRouter><ReportesNav /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Resumen diario' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
  it('conserva los reportes del administrador sin ofrecer la configuración del dueño', () => {
    auth.rol = 'administrador';
    render(<MemoryRouter><ReportesNav /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Ventas' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resumen diario' })).not.toBeInTheDocument();
  });
});
