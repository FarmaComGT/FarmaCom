import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  actualizarPromocion,
  cambiarEstadoPromocion,
  crearPromocion,
  obtenerPromocionesProducto,
} from './promociones';

vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('API de promociones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta las promociones de un producto', async () => {
    api.get.mockResolvedValue({ data: [{ id_promocion: 1 }] });

    await expect(obtenerPromocionesProducto(4)).resolves.toEqual([{ id_promocion: 1 }]);
    expect(api.get).toHaveBeenCalledWith('/productos/4/promociones', { signal: undefined });
  });

  it('crea y actualiza promociones usando las rutas existentes', async () => {
    api.post.mockResolvedValue({ data: { id_promocion: 2 } });
    api.put.mockResolvedValue({ data: { id_promocion: 2, precio_promocion: 8 } });

    await crearPromocion(4, { precio_promocion: 9 });
    await actualizarPromocion(2, { precio_promocion: 8 });

    expect(api.post).toHaveBeenCalledWith('/productos/4/promociones', { precio_promocion: 9 });
    expect(api.put).toHaveBeenCalledWith('/promociones/2', { precio_promocion: 8 });
  });

  it('activa o desactiva una promoción', async () => {
    api.patch.mockResolvedValue({ data: { promocion: { id_promocion: 2, activo: true } } });

    await cambiarEstadoPromocion(2, true);

    expect(api.patch).toHaveBeenCalledWith('/promociones/2/estado', { activo: true });
  });
});
