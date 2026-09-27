import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { getCurrentUser, login, logout } from './auth';

vi.mock('./axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

describe('API de auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia sesión enviando las credenciales y sin manejo global de 401', async () => {
    api.post.mockResolvedValue({ data: { usuario: { id_usuario: 1 } } });

    const resultado = await login('ana@x.com', 'clave123');

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      correo_usuario: 'ana@x.com',
      contrasena: 'clave123',
    }, { skipAuthHandling: true });
    expect(resultado).toEqual({ usuario: { id_usuario: 1 } });
  });

  it('cierra sesión sin manejo global de 401', async () => {
    api.post.mockResolvedValue({ data: { mensaje: 'ok' } });

    await logout();

    expect(api.post).toHaveBeenCalledWith('/auth/logout', {}, { skipAuthHandling: true });
  });

  it('obtiene el usuario actual', async () => {
    api.get.mockResolvedValue({ data: { id_usuario: 1 } });

    await expect(getCurrentUser()).resolves.toEqual({ id_usuario: 1 });
    expect(api.get).toHaveBeenCalledWith('/auth/me');
  });
});
