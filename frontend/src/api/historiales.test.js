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

  it('agrupa y ordena los cambios de precio de todos los lotes del producto', async () => {
    api.get.mockImplementation(async (ruta) => {
      if (ruta === '/lotes/producto/4') {
        return { data: [
          { id_lote: 10, numero_lote: 'LOTE-A' },
          { id_lote: 11, numero_lote: 'LOTE-B' },
        ] };
      }
      if (ruta === '/lotes/10/historial-precios') {
        return { data: [{ id_historial_precio: 1, fecha_cambio: '2026-01-01T10:00:00Z' }] };
      }
      return { data: [{ id_historial_precio: 2, fecha_cambio: '2026-02-01T10:00:00Z' }] };
    });

    const resultado = await obtenerHistorialPreciosProducto(4);

    expect(resultado.map((cambio) => cambio.id_historial_precio)).toEqual([2, 1]);
    expect(resultado[0]).toMatchObject({ id_lote: 11, numero_lote: 'LOTE-B' });
    expect(api.get).toHaveBeenCalledTimes(3);
  });
});
