import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { obtenerHistorialExpediente, obtenerHistorialPreciosProducto } from './historiales';

vi.mock('./axios', () => ({
  default: { get: vi.fn() },
}));

describe('API de historiales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta la bitácora por id de expediente', async () => {
    const historial = [{ id_bitacora: 1 }];
    api.get.mockResolvedValue({ data: historial });

    await expect(obtenerHistorialExpediente(7)).resolves.toEqual(historial);
    expect(api.get).toHaveBeenCalledWith('/expedientes/7/bitacora');
  });

  it('consulta el historial completo del producto en una sola solicitud', async () => {
    const historial = [
      { id_historial_precio: 2, numero_lote: 'LOTE-B' },
      { id_historial_precio: 1, numero_lote: 'LOTE-A' },
    ];
    api.get.mockResolvedValue({ data: historial });

    const resultado = await obtenerHistorialPreciosProducto(4);

    expect(resultado).toEqual(historial);
    expect(api.get).toHaveBeenCalledOnce();
    expect(api.get).toHaveBeenCalledWith('/productos/4/historial-precios');
  });
});
