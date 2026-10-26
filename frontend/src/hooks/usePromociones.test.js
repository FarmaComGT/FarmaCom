import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  actualizarPromocion,
  cambiarEstadoPromocion,
  crearPromocion,
  obtenerPromocionesProducto,
} from '../api/promociones';
import usePromociones from './usePromociones';

vi.mock('../api/promociones', () => ({
  obtenerPromocionesProducto: vi.fn(),
  crearPromocion: vi.fn(),
  actualizarPromocion: vi.fn(),
  cambiarEstadoPromocion: vi.fn(),
}));

const promocion = {
  id_promocion: 1,
  id_producto: 4,
  cantidad_minima: 3,
  precio_promocion: '7.50',
  activo: true,
};

describe('usePromociones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerPromocionesProducto.mockResolvedValue([promocion]);
  });

  it('no consulta promociones sin producto seleccionado', async () => {
    const { result } = renderHook(() => usePromociones(null));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.promociones).toEqual([]);
    expect(obtenerPromocionesProducto).not.toHaveBeenCalled();
  });

  it('carga las promociones del producto con una señal cancelable', async () => {
    const { result } = renderHook(() => usePromociones(4));

    await waitFor(() => expect(result.current.promociones).toEqual([promocion]));
    expect(result.current.cargando).toBe(false);
    expect(obtenerPromocionesProducto).toHaveBeenCalledWith(4, { signal: expect.any(AbortSignal) });
  });

  it('cancela la consulta anterior al cambiar de producto', async () => {
    const { rerender } = renderHook(({ id }) => usePromociones(id), { initialProps: { id: 4 } });
    const primeraSenal = obtenerPromocionesProducto.mock.calls[0][1].signal;

    rerender({ id: 5 });

    expect(primeraSenal.aborted).toBe(true);
    await waitFor(() => expect(obtenerPromocionesProducto).toHaveBeenCalledWith(5, expect.anything()));
  });

  it('expone el mensaje del backend si falla la carga', async () => {
    obtenerPromocionesProducto.mockRejectedValue({ response: { data: { mensaje: 'Producto no encontrado' } } });

    const { result } = renderHook(() => usePromociones(4));

    await waitFor(() => expect(result.current.error).toBe('Producto no encontrado'));
    expect(result.current.promociones).toEqual([]);
  });

  it('usa un mensaje genérico si el error no trae detalle', async () => {
    obtenerPromocionesProducto.mockRejectedValue({});

    const { result } = renderHook(() => usePromociones(4));

    await waitFor(() => expect(result.current.error).toBe('No se pudieron cargar las promociones.'));
  });

  it('ignora la cancelación de una consulta', async () => {
    obtenerPromocionesProducto.mockRejectedValue({ name: 'CanceledError' });

    const { result } = renderHook(() => usePromociones(4));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('agrega una promoción nueva al inicio de la lista', async () => {
    const nueva = { ...promocion, id_promocion: 2 };
    crearPromocion.mockResolvedValue(nueva);
    const { result } = renderHook(() => usePromociones(4));
    await waitFor(() => expect(result.current.promociones).toHaveLength(1));

    await act(async () => {
      await expect(result.current.crear({ cantidad_minima: 3 })).resolves.toEqual(nueva);
    });

    expect(crearPromocion).toHaveBeenCalledWith(4, { cantidad_minima: 3 });
    expect(result.current.promociones.map(({ id_promocion: id }) => id)).toEqual([2, 1]);
  });

  it('actualiza solo la promoción editada', async () => {
    obtenerPromocionesProducto.mockResolvedValue([promocion, { ...promocion, id_promocion: 2 }]);
    actualizarPromocion.mockResolvedValue({ precio_promocion: '6.00' });
    const { result } = renderHook(() => usePromociones(4));
    await waitFor(() => expect(result.current.promociones).toHaveLength(2));

    await act(async () => {
      await result.current.actualizar('1', { precio_promocion: 6 });
    });

    expect(actualizarPromocion).toHaveBeenCalledWith('1', { precio_promocion: 6 });
    expect(result.current.promociones[0].precio_promocion).toBe('6.00');
    expect(result.current.promociones[1].precio_promocion).toBe('7.50');
  });

  it('desactiva una promoción y conserva el resultado del servidor', async () => {
    cambiarEstadoPromocion.mockResolvedValue({ mensaje: 'Promoción desactivada correctamente', promocion: { id_promocion: 1 } });
    const { result } = renderHook(() => usePromociones(4));
    await waitFor(() => expect(result.current.promociones).toHaveLength(1));

    await act(async () => {
      await expect(result.current.cambiarEstado(1, false))
        .resolves.toMatchObject({ mensaje: 'Promoción desactivada correctamente' });
    });

    expect(cambiarEstadoPromocion).toHaveBeenCalledWith(1, false);
    expect(result.current.promociones[0].activo).toBe(false);
  });

  it('permite volver a consultar con refrescar', async () => {
    const { result } = renderHook(() => usePromociones(4));
    await waitFor(() => expect(obtenerPromocionesProducto).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refrescar();
    });

    expect(obtenerPromocionesProducto).toHaveBeenCalledTimes(2);
  });
});
