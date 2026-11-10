import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RedirigirAInicio from './RedirigirAInicio.jsx';

const auth = vi.hoisted(() => ({ rol: 'laboratorista' }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ usuario: { rol: auth.rol } }) }));

describe('RedirigirAInicio', () => {
  it.each([
    ['dueno', '/reports'],
    ['administrador', '/reports'],
    ['dependiente', '/caja'],
    ['laboratorista', '/laboratorio/pacientes'],
  ])('lleva a %s desde /dashboard a su pantalla de aterrizaje', (rol, destino) => {
    auth.rol = rol;
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<RedirigirAInicio />} />
          <Route path={destino} element={<p>Destino de prueba</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Destino de prueba')).toBeInTheDocument();
  });
});
