import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import api from '../api/axios';
import useAutocompletadoPOS from './useAutocompletadoPOS';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

describe('useAutocompletadoPOS', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('consulta el endpoint y normaliza los datos para el carrito', async () => {
    api.get.mockResolvedValue({
      data: [{
        id_producto: '2',
        id_lote: '9',
        stock_disponible: '12',
        precio_venta: '7.50',
        id_promocion: '3',
        promocion_cantidad_minima: '4',
        precio_promocion: '6.25',
        promocion_fecha_inicio: '2026-10-01',
        promocion_fecha_fin: '2026-12-31',
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
      stock_disponible: 12,
      precio_minimo: 7.5,
      precio_maximo: 7.5,
      tiene_precio: true,
      cantidad_lotes: 1,
      lotes: [expect.objectContaining({ id_lote: 9, stock_disponible: 12 })],
      promocion: {
        id_promocion: 3,
        cantidad_minima: 4,
        precio_promocion: 6.25,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-12-31',
      },
    });
  });

  it('devuelve un resultado por producto con todos sus lotes disponibles', async () => {
    api.get.mockResolvedValue({
      data: [
        {
          id_producto: '2', id_lote: '10', stock_disponible: '3',
          precio_venta: '7.50', fecha_vencimiento: '2027-05-01',
        },
        {
          id_producto: '2', id_lote: '9', stock_disponible: '4',
          precio_venta: '7.50', fecha_vencimiento: '2027-02-01',
        },
      ],
    });
    const { result } = renderHook(() => useAutocompletadoPOS(''));

    let productos;
    await act(async () => {
      productos = await result.current.buscarAhora('para');
    });

    expect(productos).toHaveLength(1);
    expect(productos[0]).toMatchObject({
      id_producto: 2,
      stock_disponible: 7,
      cantidad_lotes: 2,
      precio_minimo: 7.5,
      precio_maximo: 7.5,
    });
    expect(productos[0].lotes.map(({ id_lote }) => id_lote)).toEqual([9, 10]);
  });

  it('conserva el debounce de 300 ms antes de buscar automáticamente', async () => {
    vi.useFakeTimers();
    api.get.mockResolvedValue({ data: [] });
    const { rerender } = renderHook(
      ({ busqueda }) => useAutocompletadoPOS(busqueda),
      { initialProps: { busqueda: '' } },
    );

    rerender({ busqueda: 'ibuprofeno' });
    expect(api.get).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(api.get).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(api.get).toHaveBeenCalledWith('/productos/autocompletar', {
      params: { busqueda: 'ibuprofeno', limite: 10 },
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

  it('respeta el orden Damerau-Levenshtein recibido del backend', async () => {
    api.get.mockResolvedValue({
      data: [
        {
          id_producto: '1',
          id_lote: '1',
          stock_disponible: '1',
          precio_venta: '5.00',
          relevancia: '1',
          tipo_coincidencia: 'exacta',
        },
        {
          id_producto: '3',
          id_lote: '3',
          stock_disponible: '1',
          precio_venta: '5.00',
          relevancia: '0.42',
          tipo_coincidencia: 'aproximada',
        },
        {
          id_producto: '2',
          id_lote: '2',
          stock_disponible: '1',
          precio_venta: '5.00',
          relevancia: '0.78',
          tipo_coincidencia: 'aproximada',
        },
      ],
    });
    const { result } = renderHook(() => useAutocompletadoPOS(''));

    let productos;
    await act(async () => {
      productos = await result.current.buscarAhora('paracetamlo');
    });

    expect(productos.map((producto) => producto.id_producto)).toEqual([1, 3, 2]);
    expect(productos[1]).toMatchObject({
      tipo_coincidencia: 'aproximada',
      relevancia: 0.42,
    });
  });
});
