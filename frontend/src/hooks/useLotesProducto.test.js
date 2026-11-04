import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useLotesProducto from './useLotesProducto';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

describe('useLotesProducto', () => {
  it('envía página, tamaño, sucursal y estados al servidor', async () => {
    const paginacion = { pagina: 2, limite: 10, total: 11, total_paginas: 2 };
    api.get.mockResolvedValue({ data: { datos: [{ id_lote: 11 }], paginacion } });
    const { result } = renderHook(() => useLotesProducto(7, { pagina: 2, limite: 10,
      id_sucursal: 3, estado_stock: 'agotado', estado_vencimiento: 'vencido' }));
    await waitFor(() => expect(result.current.paginacion).toEqual(paginacion));
    expect(api.get).toHaveBeenCalledWith('/lotes/producto/7', { params: { pagina: 2, limite: 10,
      id_sucursal: 3, estado_stock: 'agotado', estado_vencimiento: 'vencido' } });
    expect(result.current.lotes).toEqual([{ id_lote: 11 }]);
  });

  it('descarta respuestas anteriores cuando cambia la página', async () => {
    let anterior;
    api.get.mockImplementationOnce(() => new Promise((resolve) => { anterior = resolve; }))
      .mockResolvedValueOnce({ data: { datos: [{ id_lote: 2 }], paginacion: { pagina: 2 } } });
    const { result, rerender } = renderHook(({ pagina }) => useLotesProducto(7, { pagina }),
      { initialProps: { pagina: 1 } });
    rerender({ pagina: 2 });
    await waitFor(() => expect(result.current.paginacion?.pagina).toBe(2));
    await act(async () => anterior({ data: { datos: [{ id_lote: 1 }], paginacion: { pagina: 1 } } }));
    expect(result.current.lotes).toEqual([{ id_lote: 2 }]);
    expect(result.current.paginacion.pagina).toBe(2);
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada si está deshabilitado', () => {
    renderHook(() => useLotesProducto(1, { enabled: false }));

    expect(api.get).not.toHaveBeenCalled();
  });

  it('no consulta nada sin id de producto', () => {
    renderHook(() => useLotesProducto(null));

    expect(api.get).not.toHaveBeenCalled();
  });

  it('carga los lotes del producto', async () => {
    api.get.mockResolvedValue({ data: [{ id_lote: 1 }] });

    const { result } = renderHook(() => useLotesProducto(7));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.lotes).toEqual([{ id_lote: 1 }]);
    expect(api.get).toHaveBeenCalledWith('/lotes/producto/7');
  });

  it('limpia los lotes y expone el error si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useLotesProducto(7));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
    expect(result.current.lotes).toEqual([]);
  });

  it('vuelve a cargar cuando cambia refreshKey', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { rerender } = renderHook(
      ({ refreshKey }) => useLotesProducto(7, { refreshKey }),
      { initialProps: { refreshKey: 0 } },
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    rerender({ refreshKey: 1 });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});
