import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { actualizarLaboratorio, crearLaboratorio, listarLaboratorios } from './laboratorios';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
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

  it('crea un laboratorio', async () => {
    const datos = { nombre_laboratorio: 'Central', id_ciudad: 1, direccion: 'Zona 1' };
    api.post.mockResolvedValue({ data: { id_laboratorio: 2, ...datos } });

    await expect(crearLaboratorio(datos)).resolves.toEqual({ id_laboratorio: 2, ...datos });
    expect(api.post).toHaveBeenCalledWith('/laboratorios', datos);
  });

  it('actualiza un laboratorio', async () => {
    const datos = { nombre_laboratorio: 'Norte', id_ciudad: 2, direccion: 'Zona 17' };
    api.put.mockResolvedValue({ data: { id_laboratorio: 2, ...datos } });

    await expect(actualizarLaboratorio(2, datos)).resolves.toEqual({ id_laboratorio: 2, ...datos });
    expect(api.put).toHaveBeenCalledWith('/laboratorios/2', datos);
  });
});
