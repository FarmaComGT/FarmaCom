import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from './Dashboard';
const auth = vi.hoisted(() => ({ rol: 'laboratorista' }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ usuario: { rol: auth.rol, nombre_usuario: 'María López '.repeat(12) } }) }));
describe('Inicio de trabajo', () => {
  it('ofrece tareas reales de laboratorio', () => {
    auth.rol = 'laboratorista';
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeVisible();
    expect(document.title).toBe('Inicio · FarmaCom');
    const trabajo = screen.getByRole('region', { name: 'Trabajo de laboratorio' });
    const destinos = within(trabajo).getAllByRole('link').map(a => a.getAttribute('href'));
    expect(destinos).toEqual(['/laboratorio/pacientes']);
  });
  it.each([
    ['dueno', '/reports'],
    ['administrador', '/reports'],
    ['dependiente', '/caja'],
  ])('redirige a %s fuera de Inicio', (rol, destino) => {
    auth.rol = rol;
    render(<MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path={destino} element={<p>Destino de prueba</p>} />
      </Routes>
    </MemoryRouter>);
    expect(screen.getByText('Destino de prueba')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Inicio' })).not.toBeInTheDocument();
  });
});
