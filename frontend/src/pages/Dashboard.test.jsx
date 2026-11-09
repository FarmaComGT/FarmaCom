import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from './Dashboard';
const auth = vi.hoisted(() => ({ rol: 'dependiente' }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ usuario: { rol: auth.rol, nombre_usuario: 'María López '.repeat(12) } }) }));
describe('Inicio de trabajo', () => {
  it.each(['dependiente', 'laboratorista'])('ofrece tareas reales para %s', rol => {
    auth.rol = rol;
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeVisible();
    expect(document.title).toBe('Inicio · FarmaCom');
    const trabajo = screen.getByRole('region', { name: rol === 'laboratorista' ? 'Trabajo de laboratorio' : 'Trabajo de farmacia' });
    const destinos = within(trabajo).getAllByRole('link').map(a => a.getAttribute('href'));
    expect(destinos).toEqual(rol === 'laboratorista' ? ['/laboratorio/pacientes'] : ['/pos', '/caja', '/inventario']);
  });
  it.each(['dueno', 'administrador'])('redirige a los reportes para %s en lugar de mostrar Inicio', rol => {
    auth.rol = rol;
    render(<MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<p>Reportes</p>} />
      </Routes>
    </MemoryRouter>);
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Inicio' })).not.toBeInTheDocument();
  });
});
