import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useCatalogoPOS from './useCatalogoPOS';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

const inventario = [{
  id_producto: 1,
  codigo: 'MED001',
  nombre_comercial: 'Tylenol',
  nombre_generico: 'Paracetamol',
  activo: true,
}];

const lotes = [{
  id_lote: 1,
  id_producto: 1,
  numero_lote: 'L-001',
  fecha_vencimiento: '2027-01-01',
  estado_vencimiento: 'normal',
  stock_actual: 10,
  precio_venta: 5,
}];

describe('useCatalogoPOS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta la API si no hay sucursal activa', async () => {
    const { result } = renderHook(() => useCatalogoPOS(null));

    await waitFor(() => {
      expect(result.current.error).toBe('No hay una sucursal activa para realizar la venta.');
    });
    expect(result.current.productos).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('carga inventario y lotes en paralelo y arma el catálogo', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/inventario')) return Promise.resolve({ data: inventario });
      return Promise.resolve({ data: lotes });
    });

    const { result } = renderHook(() => useCatalogoPOS(1));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(api.get).toHaveBeenCalledWith('/sucursales/1/inventario');
    expect(api.get).toHaveBeenCalledWith('/lotes/sucursal/1');
    expect(result.current.productos).toHaveLength(1);
    expect(result.current.productos[0].nombre_comercial).toBe('Tylenol');
    expect(result.current.error).toBeNull();
  });

  it('expone un error si falla la carga del catálogo', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo de red' } } });

    const { result } = renderHook(() => useCatalogoPOS(1));

    await waitFor(() => expect(result.current.error).toBe('Fallo de red'));
    expect(result.current.productos).toEqual([]);
  });
});
