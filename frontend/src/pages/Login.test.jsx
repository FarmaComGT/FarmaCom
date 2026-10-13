import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Login from './Login.jsx';

vi.mock('../api/auth', () => ({
  login: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AUTH_ACTIONS: { LOGIN: 'LOGIN' },
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const renderizar = () => render(
  <MemoryRouter>
    <Login />
  </MemoryRouter>,
);

describe('pantalla de login', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ dispatch });
  });

  it('inicia sesión y redirige según el rol', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ usuario: { id_usuario: 1, rol: 'administrador', id_sucursal: 3 } });

    renderizar();

    await user.type(screen.getByLabelText('Usuario'), 'admin@farmacom.test');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('admin@farmacom.test', 'secreta123'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'LOGIN',
      payload: { usuario: { id_usuario: 1, rol: 'administrador', id_sucursal: 3 }, sucursalActivaId: 3 },
    });
    expect(navigateMock).toHaveBeenCalledWith('/usuarios', { replace: true });
  });

  it('redirige siempre a la ruta por defecto cuando el rol es laboratorista', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ usuario: { id_usuario: 2, rol: 'laboratorista' } });

    renderizar();

    await user.type(screen.getByLabelText('Usuario'), 'labo@farmacom.test');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/laboratorio/pacientes', { replace: true }));
  });

  it('muestra el mensaje de error del backend si falla el login', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue({ response: { data: { mensaje: 'Credenciales inválidas' } } });

    renderizar();

    await user.type(screen.getByLabelText('Usuario'), 'admin@farmacom.test');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('muestra un mensaje genérico cuando el backend no envía detalle del error', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(new Error('network error'));

    renderizar();

    await user.type(screen.getByLabelText('Usuario'), 'admin@farmacom.test');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
  });

  it('deshabilita el botón mientras se está iniciando sesión', async () => {
    const user = userEvent.setup();
    let resolverLogin;
    login.mockReturnValue(new Promise((resolve) => { resolverLogin = resolve; }));

    renderizar();

    await user.type(screen.getByLabelText('Usuario'), 'admin@farmacom.test');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.getByRole('button', { name: 'Iniciando sesión...' })).toBeDisabled();

    resolverLogin({ usuario: { id_usuario: 1, rol: 'vendedor' } });
    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
  });
});
