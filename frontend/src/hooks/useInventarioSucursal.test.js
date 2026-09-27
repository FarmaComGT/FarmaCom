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
    api.get.mockImplementation((url) => (
      url.includes('/resumen')
        ? Promise.resolve({ data: { total_productos: 5, productos_criticos: 1, productos_proximos_vencer: 0, productos_optimos: 4 } })
        : Promise.resolve({ data: [{ id_producto: 1 }] })
    ));

    const { result } = renderHook(() => useInventarioSucursal(2));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.productos).toEqual([{ id_producto: 1 }]);
    expect(result.current.resumen.total_productos).toBe(5);
    expect(api.get).toHaveBeenCalledWith('/sucursales/2/inventario');
    expect(api.get).toHaveBeenCalledWith('/sucursales/2/inventario/resumen');
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useInventarioSucursal(2));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });
});
