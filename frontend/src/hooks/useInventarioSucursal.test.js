import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useInventarioSucursal from './useInventarioSucursal';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

describe('useInventarioSucursal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada sin id de sucursal', () => {
    renderHook(() => useInventarioSucursal(null));

    expect(api.get).not.toHaveBeenCalled();
  });

  it('carga el inventario y el resumen en paralelo', async () => {
    const resumen = {
      total_productos: 5,
      productos_sin_lotes: 1,
      productos_agotados: 1,
      productos_poco_stock: 1,
      productos_vencidos: 1,
      productos_criticos: 2,
      productos_proximos_vencer: 1,
      productos_optimos: 1,
    };
    api.get.mockImplementation((url) => (
      url.includes('/resumen')
        ? Promise.resolve({ data: resumen })
        : Promise.resolve({ data: [{
          id_producto: 1,
          estado_stock: 'poco_stock',
          estado_vencimiento: 'proximo_a_vencer',
        }] })
    ));

    const { result } = renderHook(() => useInventarioSucursal(2));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.productos).toEqual([{
      id_producto: 1,
      estado_stock: 'poco_stock',
      estado_vencimiento: 'proximo_a_vencer',
    }]);
    expect(result.current.resumen).toEqual(resumen);
    expect(api.get).toHaveBeenCalledWith('/sucursales/2/inventario');
    expect(api.get).toHaveBeenCalledWith('/sucursales/2/inventario/resumen');
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useInventarioSucursal(2));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });
});
