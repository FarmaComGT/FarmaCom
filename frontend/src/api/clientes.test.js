import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { obtenerHistorialCompras } from './clientes';

vi.mock('./axios', () => ({
  default: { get: vi.fn() },
}));

describe('API de clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtiene el historial de compras enviando los filtros como params', async () => {
    const historial = [{ id_venta: 1 }];
    api.get.mockResolvedValue({ data: historial });

    const filtros = { id_sucursal: 2, estado: 'completada' };
    const resultado = await obtenerHistorialCompras(5, filtros);

    expect(api.get).toHaveBeenCalledWith('/clientes/5/historial-compras', { params: filtros });
    expect(resultado).toEqual(historial);
  });

  it('funciona sin filtros', async () => {
    api.get.mockResolvedValue({ data: [] });

    await obtenerHistorialCompras(5);

    expect(api.get).toHaveBeenCalledWith('/clientes/5/historial-compras', { params: {} });
  });
});
