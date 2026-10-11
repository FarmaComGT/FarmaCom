import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerVentas } from '../api/ventas';
import { obtenerResumenProductos } from '../api/reportes';
import { useResumenProductos, useVentas } from './useHistorialVentas';

vi.mock('../api/ventas', () => ({ obtenerVentas: vi.fn() }));
vi.mock('../api/reportes', () => ({ obtenerResumenProductos: vi.fn() }));

describe('hooks del historial de ventas', () => {
  const filtros = {
    id_sucursal: 2,
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-10',
  };

  beforeEach(() => vi.clearAllMocks());

  it('carga y permite recargar las ventas', async () => {
    obtenerVentas.mockResolvedValue([{ id_venta: 1 }]);
    const { result } = renderHook(() => useVentas(filtros));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.datos).toEqual([{ id_venta: 1 }]);
    act(() => result.current.recargar());
    await waitFor(() => expect(obtenerVentas).toHaveBeenCalledTimes(2));
  });

  it('expone el error al cargar el resumen de productos', async () => {
    obtenerResumenProductos.mockRejectedValue(new Error('No disponible'));
    const { result } = renderHook(() => useResumenProductos(filtros));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('No disponible');
    expect(result.current.datos).toEqual([]);
  });
});
