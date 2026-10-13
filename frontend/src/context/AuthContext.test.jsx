import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getCurrentUser } from '../api/auth';
import { setUnauthorizedHandler } from '../api/authSession';
import { clearSession, saveSession } from '../utils/auth';
import { AUTH_ACTIONS, AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../api/authSession', () => ({
  setUnauthorizedHandler: vi.fn(() => () => {}),
}));

vi.mock('../utils/auth', () => ({
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza un error si se usa fuera del provider', () => {
    const { result } = renderHook(() => {
      try {
        return useAuth();
      } catch (error) {
        return error;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect(result.current.message).toBe('useAuth debe usarse dentro de <AuthProvider>');
  });

  it('inicia en estado "checking"', () => {
    getCurrentUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.status).toBe('checking');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restaura la sesión cuando getCurrentUser resuelve', async () => {
    getCurrentUser.mockResolvedValue({ usuario: { id_usuario: 1, id_sucursal: 2 } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.usuario).toEqual({ id_usuario: 1, id_sucursal: 2 });
    expect(result.current.sucursalActivaId).toBe(2);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('usa sucursalActivaId del payload si viene explícito al despachar LOGIN', async () => {
    getCurrentUser.mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    act(() => {
      result.current.dispatch({
        type: AUTH_ACTIONS.LOGIN,
        payload: { usuario: { id_usuario: 1, id_sucursal: 2 }, sucursalActivaId: 9 },
      });
    });

    expect(result.current.sucursalActivaId).toBe(9);
  });

  it('pasa a "unauthenticated" cuando getCurrentUser falla', async () => {
    getCurrentUser.mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(result.current.usuario).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('guarda la sesión en localStorage cuando hay usuario autenticado', async () => {
    getCurrentUser.mockResolvedValue({ usuario: { id_usuario: 1, id_sucursal: 2 } });

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(saveSession).toHaveBeenCalledWith({
      usuario: { id_usuario: 1, id_sucursal: 2 },
      sucursalActivaId: 2,
    }));
  });

  it('limpia la sesión cuando no hay usuario', async () => {
    getCurrentUser.mockRejectedValue(new Error('401'));

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(clearSession).toHaveBeenCalled());
  });

  it('despacha LOGIN y actualiza el estado', async () => {
    getCurrentUser.mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    act(() => {
      result.current.dispatch({
        type: AUTH_ACTIONS.LOGIN,
        payload: { usuario: { id_usuario: 5 } },
      });
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.usuario).toEqual({ id_usuario: 5 });
    expect(result.current.sucursalActivaId).toBeNull();
  });

  it('despacha SET_SUCURSAL_ACTIVA sin afectar al usuario', async () => {
    getCurrentUser.mockResolvedValue({ usuario: { id_usuario: 1, id_sucursal: 2 } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    act(() => {
      result.current.dispatch({ type: AUTH_ACTIONS.SET_SUCURSAL_ACTIVA, payload: 7 });
    });

    expect(result.current.sucursalActivaId).toBe(7);
    expect(result.current.usuario).toEqual({ id_usuario: 1, id_sucursal: 2 });
  });

  it('despacha LOGOUT y limpia el estado', async () => {
    getCurrentUser.mockResolvedValue({ usuario: { id_usuario: 1, id_sucursal: 2 } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    act(() => {
      result.current.dispatch({ type: AUTH_ACTIONS.LOGOUT });
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.usuario).toBeNull();
    expect(result.current.sucursalActivaId).toBeNull();
  });

  it('ignora acciones desconocidas', async () => {
    getCurrentUser.mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    act(() => {
      result.current.dispatch({ type: 'ACCION_DESCONOCIDA' });
    });

    expect(result.current.status).toBe('unauthenticated');
  });

  it('registra un manejador de no autorizado que despacha LOGOUT', async () => {
    getCurrentUser.mockResolvedValue({ usuario: { id_usuario: 1, id_sucursal: 2 } });
    let handlerCapturado;
    setUnauthorizedHandler.mockImplementation((handler) => {
      handlerCapturado = handler;
      return () => {};
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    act(() => {
      handlerCapturado();
    });

    expect(result.current.status).toBe('unauthenticated');
  });
});
