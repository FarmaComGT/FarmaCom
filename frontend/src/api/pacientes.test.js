import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  actualizarPaciente,
  anularPaciente,
  buscarPacientes,
  crearPaciente,
  obtenerPaciente,
} from './pacientes';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

describe('API de pacientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca pacientes con los parámetros dados', async () => {
    api.get.mockResolvedValue({ data: [{ id_paciente: 1 }] });

    const params = { busqueda: 'Ana' };
    await expect(buscarPacientes(params)).resolves.toEqual([{ id_paciente: 1 }]);
    expect(api.get).toHaveBeenCalledWith('/pacientes', { params });
  });

  it('obtiene un paciente por id', async () => {
    api.get.mockResolvedValue({ data: { id_paciente: 1 } });

    await expect(obtenerPaciente(1)).resolves.toEqual({ id_paciente: 1 });
    expect(api.get).toHaveBeenCalledWith('/pacientes/1');
  });

  it('crea un paciente', async () => {
    const datos = { nombre: 'Ana' };
    api.post.mockResolvedValue({ data: { id_paciente: 1, ...datos } });

    await expect(crearPaciente(datos)).resolves.toEqual({ id_paciente: 1, nombre: 'Ana' });
    expect(api.post).toHaveBeenCalledWith('/pacientes', datos);
  });

  it('actualiza un paciente', async () => {
    const datos = { nombre: 'Ana 2' };
    api.put.mockResolvedValue({ data: { id_paciente: 1, ...datos } });

    await expect(actualizarPaciente(1, datos)).resolves.toEqual({ id_paciente: 1, nombre: 'Ana 2' });
    expect(api.put).toHaveBeenCalledWith('/pacientes/1', datos);
  });

  it('anula un paciente con motivo', async () => {
    api.patch.mockResolvedValue({ data: { mensaje: 'ok' } });

    await anularPaciente(1, 'Duplicado');

    expect(api.patch).toHaveBeenCalledWith('/pacientes/1/anular', { motivo_anulacion: 'Duplicado' });
  });
});
