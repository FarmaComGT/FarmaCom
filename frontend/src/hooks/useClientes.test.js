import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useClientes from './useClientes';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useClientes', () => {
  it('consulta una página con búsqueda remota y vuelve a consultar después de eliminar', async () => {
    api.get.mockResolvedValue({ data: { datos: [{ id_cliente: 26 }],
      paginacion: { pagina: 2, limite: 25, total: 26, total_paginas: 2 } } });
    const { result } = renderHook(() => useClientes({ pagina: 2, limite: 25, busqueda: ' Ana ' }));
    await waitFor(() => expect(result.current.paginacion?.total).toBe(26));
    expect(api.get).toHaveBeenLastCalledWith('/clientes', { params: { pagina: 2, limite: 25, busqueda: 'Ana' } });
    api.delete.mockResolvedValue({});
    api.get.mockResolvedValue({ data: { datos: [], paginacion: { pagina: 1, limite: 25, total: 25, total_paginas: 1 } } });
    await act(async () => { await result.current.eliminar(26); });
    expect(result.current.paginacion.pagina).toBe(1);
    expect(result.current.clientes).toEqual([]);
  });

  it('descarta la respuesta anterior mientras cambia la búsqueda', async () => {
    let responderAnterior;
    api.get.mockImplementationOnce(() => new Promise((resolve) => { responderAnterior = resolve; }));
    const { result, rerender } = renderHook(({ busqueda }) => useClientes({ pagina: 1, limite: 10, busqueda }),
      { initialProps: { busqueda: 'Ana' } });
    await waitFor(() => expect(responderAnterior).toBeTypeOf('function'));
    api.get.mockResolvedValue({ data: { datos: [{ id_cliente: 2 }], paginacion: { pagina: 1, total: 1 } } });
    rerender({ busqueda: 'María' });
    await act(async () => { responderAnterior({ data: { datos: [{ id_cliente: 1 }], paginacion: { total: 99 } } }); });
    expect(result.current.paginacion).toBeNull();
    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.clientes).toEqual([{ id_cliente: 2 }]));
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga los clientes al montar', async () => {
    const clientes = [{ id_cliente: 1, nombre_cliente: 'Ana' }];
    api.get.mockResolvedValue({ data: clientes });

    const { result } = renderHook(() => useClientes());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.clientes).toEqual(clientes);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'No se pudo conectar' } } });

    const { result } = renderHook(() => useClientes());

    await waitFor(() => expect(result.current.error).toBe('No se pudo conectar'));
  });

  it('crea un cliente y mantiene la lista ordenada por nombre', async () => {
    api.get.mockResolvedValue({ data: [{ id_cliente: 1, nombre_cliente: 'Zoe' }] });
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_cliente: 2, nombre_cliente: 'Ana' } });

    await act(async () => {
      await result.current.crear({ nombre_cliente: 'Ana' });
    });

    expect(result.current.clientes.map((c) => c.nombre_cliente)).toEqual(['Ana', 'Zoe']);
  });

  it('actualiza un cliente existente manteniendo el orden', async () => {
    api.get.mockResolvedValue({ data: [{ id_cliente: 1, nombre_cliente: 'Ana' }] });
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockResolvedValue({ data: { id_cliente: 1, nombre_cliente: 'Ana María' } });

    await act(async () => {
      await result.current.actualizar(1, { nombre_cliente: 'Ana María' });
    });

    expect(api.put).toHaveBeenCalledWith('/clientes/1', { nombre_cliente: 'Ana María' });
    expect(result.current.clientes[0].nombre_cliente).toBe('Ana María');
  });

  it('elimina un cliente de la lista', async () => {
    api.get.mockResolvedValue({ data: [{ id_cliente: 1, nombre_cliente: 'Ana' }] });
    const { result } = renderHook(() => useClientes());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminar(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/clientes/1');
    expect(result.current.clientes).toEqual([]);
  });
});
