import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actualizarCaja, crearCaja, obtenerCajas } from '../api/cajas';
import useAdministracionCajas from './useAdministracionCajas';

vi.mock('../api/cajas', () => ({
  obtenerCajas: vi.fn(),
  crearCaja: vi.fn(),
  actualizarCaja: vi.fn(),
}));

describe('useAdministracionCajas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerCajas.mockResolvedValue([{ id_caja: 1, nombre: 'Caja principal', activa: true }]);
  });

  it('carga, crea y actualiza cajas', async () => {
    obtenerCajas
      .mockResolvedValueOnce([{ id_caja: 1, nombre: 'Caja principal', activa: true }])
      .mockResolvedValueOnce([
        { id_caja: 1, nombre: 'Caja principal', activa: true },
        { id_caja: 2, nombre: 'Caja auxiliar', activa: true },
      ]);
    const { result } = renderHook(() => useAdministracionCajas());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    crearCaja.mockResolvedValue({ id_caja: 2, nombre: 'Caja auxiliar', activa: true });
    await act(() => result.current.crear({ id_sucursal: 1, nombre: 'Caja auxiliar' }));
    expect(result.current.cajas).toHaveLength(2);

    actualizarCaja.mockResolvedValue({ id_caja: 2, nombre: 'Caja auxiliar', activa: false });
    await act(() => result.current.actualizar(2, { activa: false }));
    expect(result.current.cajas[1].activa).toBe(false);
  });

  it('expone los errores del backend', async () => {
    obtenerCajas.mockRejectedValue({ response: { data: { mensaje: 'No se pudieron cargar.' } } });
    const { result } = renderHook(() => useAdministracionCajas());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('No se pudieron cargar.');
  });
});
