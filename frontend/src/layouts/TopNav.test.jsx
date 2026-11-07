import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopNav from './TopNav.jsx';
import api from '../api/axios';

const auth = vi.hoisted(() => ({ usuario: {}, sucursalActivaId: 1 }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));
const montar = (ruta = '/inventario?sucursal=2') => render(<MemoryRouter initialEntries={[ruta]}><TopNav sidebarAbierta onAbrirSidebar={vi.fn()} /></MemoryRouter>);

describe('contexto de trabajo en la cabecera', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.usuario = { rol: 'administrador', nombre_usuario: 'Ana' };
    auth.sucursalActivaId = 1;
    api.get.mockResolvedValue({ data: { nombre_sucursal: 'Central' } });
  });
  it('identifica la sucursal operativa sin adoptar la sucursal del filtro', async () => {
    montar();
    expect(await screen.findByLabelText('Sucursal de trabajo: Central')).toBeVisible();
    expect(api.get).toHaveBeenCalledWith('/sucursales/1', expect.any(Object));
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(auth.sucursalActivaId).toBe(1);
  });
  it('usa la sucursal asignada al dependiente', async () => {
    auth.usuario = { rol: 'dependiente', id_sucursal: 3 };
    montar();
    await screen.findByLabelText('Sucursal de trabajo: Central');
    expect(api.get).toHaveBeenCalledWith('/sucursales/3', expect.any(Object));
  });
  it('conserva un identificador válido cuando falla la carga del nombre', async () => {
    api.get.mockRejectedValue(new Error('Sin conexión'));
    montar();
    await waitFor(() => expect(api.get).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('Sucursal de trabajo: Sucursal 1')).toBeVisible();
  });
  it('no consulta sucursales cuando no hay una asignada', () => {
    auth.sucursalActivaId = null;
    montar();
    expect(screen.getByLabelText('Sucursal de trabajo: Sin sucursal de trabajo')).toBeVisible();
    expect(api.get).not.toHaveBeenCalled();
  });
  it('muestra el contexto del laboratorista sin consultar sucursales', () => {
    auth.usuario = { rol: 'laboratorista', id_laboratorio: 2 };
    montar('/laboratorio/pacientes');
    expect(screen.getByText('Trabajo: Laboratorio 2')).toBeVisible();
    expect(api.get).not.toHaveBeenCalled();
  });
});
