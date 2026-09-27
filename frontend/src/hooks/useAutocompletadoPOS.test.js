import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useAutocompletadoPOS from './useAutocompletadoPOS';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

describe('useAutocompletadoPOS', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta el endpoint y normaliza los datos para el carrito', async () => {
    api.get.mockResolvedValue({
      data: [{
        id_producto: '2',
        id_lote: '9',
        stock_disponible: '12',
        precio_venta: '7.50',
      }],
    });
    const { result } = renderHook(() => useAutocompletadoPOS(''));

    let productos;
    await act(async () => {
      productos = await result.current.buscarAhora('  para  ');
    });

    expect(api.get).toHaveBeenCalledWith('/productos/autocompletar', {
      params: { busqueda: 'para', limite: 10 },
    });
    expect(productos[0]).toMatchObject({
      id_producto: 2,
      id_lote: 9,
      carritoKey: 'lote-9',
      stock_disponible: 12,
      precio_venta: 7.5,
      tiene_precio: true,
    });
  });

  it('realiza la búsqueda automática después de escribir', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { rerender } = renderHook(
      ({ busqueda }) => useAutocompletadoPOS(busqueda),
      { initialProps: { busqueda: '' } },
    );

    rerender({ busqueda: 'ibuprofeno' });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/productos/autocompletar', {
        params: { busqueda: 'ibuprofeno', limite: 10 },
      });
    });
  });

  it('expone el mensaje recibido del backend cuando la búsqueda falla', async () => {
    api.get.mockRejectedValue({
      response: { data: { mensaje: 'Servicio temporalmente no disponible' } },
    });
    const { result } = renderHook(() => useAutocompletadoPOS(''));

    await act(async () => {
      await result.current.buscarAhora('para');
    });

    expect(result.current.productos).toEqual([]);
    expect(result.current.error).toBe('Servicio temporalmente no disponible');
  });

  it('conserva las coincidencias directas primero y ordena las aproximadas por relevancia', async () => {
    api.get.mockResolvedValue({
      data: [
        { id_producto: '3', id_lote: '3', relevancia: '0.42', tipo_coincidencia: 'aproximada' },
        { id_producto: '1', id_lote: '1', relevancia: '1', tipo_coincidencia: 'exacta' },
        { id_producto: '2', id_lote: '2', relevancia: '0.78', tipo_coincidencia: 'aproximada' },
      ],
    });
    const { result } = renderHook(() => useAutocompletadoPOS(''));

    let productos;
    await act(async () => {
      productos = await result.current.buscarAhora('paracetamlo');
    });

    expect(productos.map((producto) => producto.id_producto)).toEqual([1, 2, 3]);
    expect(productos[1]).toMatchObject({
      tipo_coincidencia: 'aproximada',
      relevancia: 0.78,
    });
  });
});
