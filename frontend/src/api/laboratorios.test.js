import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { listarLaboratorios } from './laboratorios';

vi.mock('./axios', () => ({
  default: { get: vi.fn() },
}));

describe('API de laboratorios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista los laboratorios', async () => {
    const laboratorios = [{ id_laboratorio: 1, nombre_laboratorio: 'Central' }];
    api.get.mockResolvedValue({ data: laboratorios });

    await expect(listarLaboratorios()).resolves.toEqual(laboratorios);
    expect(api.get).toHaveBeenCalledWith('/laboratorios');
  });
});
