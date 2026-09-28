import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  actualizarPaciente,
  anularPaciente,
  buscarPacientes,
  crearPaciente,
} from '../api/pacientes';
import usePacientes from './usePacientes';

vi.mock('../api/pacientes', () => ({
  buscarPacientes: vi.fn(),
  crearPaciente: vi.fn(),
  actualizarPaciente: vi.fn(),
  anularPaciente: vi.fn(),
}));

const respuestaBusqueda = (datos, total) => ({
  datos,
  paginacion: { pagina: 1, limite: 20, total, total_paginas: 1 },
});

describe('usePacientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarPacientes.mockImplementation(({ estado }) => {
      if (estado === 'activo') return Promise.resolve(respuestaBusqueda([], 3));
      if (estado === 'anulado') return Promise.resolve(respuestaBusqueda([], 1));
      return Promise.resolve(respuestaBusqueda([{ id_paciente: 1 }], 4));
    });
  });

  it('no consulta nada sin id de laboratorio', () => {
    renderHook(() => usePacientes({ idLaboratorio: null }));

    expect(buscarPacientes).not.toHaveBeenCalled();
  });

  it('carga pacientes y el resumen por estado', async () => {
    const { result } = renderHook(() => usePacientes({ idLaboratorio: 1 }));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pacientes).toEqual([{ id_paciente: 1 }]);
    await waitFor(() => expect(result.current.resumenEstados).toEqual({ activos: 3, anulados: 1 }));
  });

  it('expone el error del backend si falla la búsqueda', async () => {
    buscarPacientes.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => usePacientes({ idLaboratorio: 1 }));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('crea un paciente incluyendo el laboratorio y refresca la lista', async () => {
    const { result } = renderHook(() => usePacientes({ idLaboratorio: 1 }));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    crearPaciente.mockResolvedValue({ id_paciente: 9 });

    await act(async () => {
      await result.current.crear({ nombre: 'Ana' });
    });

    expect(crearPaciente).toHaveBeenCalledWith({ nombre: 'Ana', id_laboratorio: 1 });
  });

  it('traduce el error al crear un paciente', async () => {
    const { result } = renderHook(() => usePacientes({ idLaboratorio: 1 }));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    crearPaciente.mockRejectedValue({ response: { data: { mensaje: 'Nombre duplicado' } } });

    await expect(result.current.crear({ nombre: 'Ana' })).rejects.toThrow('Nombre duplicado');
  });

  it('actualiza un paciente y refresca la lista', async () => {
    const { result } = renderHook(() => usePacientes({ idLaboratorio: 1 }));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    actualizarPaciente.mockResolvedValue({ id_paciente: 1, nombre: 'Ana 2' });

    await act(async () => {
      await result.current.actualizar(1, { nombre: 'Ana 2' });
    });

    expect(actualizarPaciente).toHaveBeenCalledWith(1, { nombre: 'Ana 2' });
  });

  it('anula un paciente y refresca lista y resumen', async () => {
    const { result } = renderHook(() => usePacientes({ idLaboratorio: 1 }));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    anularPaciente.mockResolvedValue({ id_paciente: 1, estado: 'anulado' });

    await act(async () => {
      await result.current.anular(1, 'Duplicado');
    });

    expect(anularPaciente).toHaveBeenCalledWith(1, 'Duplicado');
  });
});
