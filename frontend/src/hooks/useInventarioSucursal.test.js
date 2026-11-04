import { act, renderHook, waitFor } from '@testing-library/react';
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
        : Promise.resolve({ data: { datos: [{
          id_producto: 1,
          estado_stock: 'poco_stock',
          estado_vencimiento: 'proximo_a_vencer',
        }], paginacion: { pagina: 1, limite: 25, total: 1, total_paginas: 1 } } })
    ));

    const { result } = renderHook(() => useInventarioSucursal(2));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.productos).toEqual([{
      id_producto: 1,
      estado_stock: 'poco_stock',
      estado_vencimiento: 'proximo_a_vencer',
    }]);
    expect(result.current.resumen).toEqual(resumen);
    expect(api.get).toHaveBeenCalledWith('/sucursales/2/inventario', { params: { pagina: 1, limite: 25 }, signal: expect.any(AbortSignal) });
    expect(api.get).toHaveBeenCalledWith('/sucursales/2/inventario/resumen', { signal: expect.any(AbortSignal) });
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useInventarioSucursal(2));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });
});


it('cambia de página sin volver a consultar el resumen', async () => {
  api.get.mockClear();
  api.get.mockImplementation((url, config) => Promise.resolve({ data: url.endsWith('/resumen')
    ? { total_productos: 26 }
    : { datos: [{ id_producto: config.params.pagina }], paginacion: { pagina: config.params.pagina, limite: 25, total: 26, total_paginas: 2 } } }));
  const { result, rerender } = renderHook(({ pagina }) => useInventarioSucursal(2, { pagina }), { initialProps: { pagina: 1 } });
  await waitFor(() => expect(result.current.productos[0]?.id_producto).toBe(1));
  rerender({ pagina: 2 });
  expect(result.current.cargando).toBe(true);
  expect(result.current.paginacion).toBeNull();
  await waitFor(() => expect(result.current.productos[0]?.id_producto).toBe(2));
  expect(api.get.mock.calls.filter(([url]) => url.endsWith('/resumen'))).toHaveLength(1);
});

it('ignora una respuesta anterior aunque el transporte no cancele', async () => {
  let terminarPrimera;
  let signalAnterior;
  api.get.mockImplementation((url, config) => {
    if (url.endsWith('/resumen')) return Promise.resolve({ data: {} });
    if (config.params.pagina === 1) {
      signalAnterior = config.signal;
      return new Promise((resolve) => { terminarPrimera = resolve; });
    }
    return Promise.resolve({ data: { datos: [{ id_producto: 2 }], paginacion: { pagina: 2 } } });
  });
  const { result, rerender } = renderHook(({ pagina }) => useInventarioSucursal(2, { pagina }), { initialProps: { pagina: 1 } });
  rerender({ pagina: 2 });
  expect(result.current.cargando).toBe(true);
  expect(result.current.paginacion).toBeNull();
  await waitFor(() => expect(result.current.productos[0]?.id_producto).toBe(2));
  expect(signalAnterior.aborted).toBe(true);
  await act(async () => terminarPrimera({ data: { datos: [{ id_producto: 1 }] } }));
  expect(result.current.productos[0].id_producto).toBe(2);
});

it('espera la pausa de búsqueda y envía filtros al servidor', async () => {
  api.get.mockClear();
  api.get.mockResolvedValue({ data: { datos: [], paginacion: { pagina: 1, limite: 25, total: 0, total_paginas: 1 } } });
  const { result, rerender } = renderHook(({ busqueda }) => useInventarioSucursal(2, { busqueda, activo: 'false', estado_stock: 'agotado' }), { initialProps: { busqueda: '' } });
  await waitFor(() => expect(result.current.cargando).toBe(false));
  const llamadas = api.get.mock.calls.length;
  rerender({ busqueda: 'para' });
  rerender({ busqueda: 'paracetamol' });
  expect(api.get.mock.calls).toHaveLength(llamadas);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/sucursales/2/inventario', {
    params: { pagina: 1, limite: 25, busqueda: 'paracetamol', activo: 'false', estado_stock: 'agotado' }, signal: expect.any(AbortSignal),
  }));
});
