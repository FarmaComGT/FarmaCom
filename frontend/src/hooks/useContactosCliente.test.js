import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useContactosCliente from './useContactosCliente';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const responderContactos = ({ telefonos = [], correos = [] } = {}) => {
  api.get.mockImplementation((url) => Promise.resolve({
    data: url.endsWith('/telefonos') ? telefonos : correos,
  }));
};

describe('useContactosCliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada sin id de cliente', () => {
    const { result } = renderHook(() => useContactosCliente(null));

    expect(result.current.telefonos).toEqual([]);
    expect(result.current.correos).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('carga teléfonos y correos del cliente en paralelo', async () => {
    responderContactos({
      telefonos: [{ id_telefono: 1, numero: '55551234' }],
      correos: [{ id_email: 1, correo: 'ana@farmacom.test' }],
    });

    const { result } = renderHook(() => useContactosCliente(3));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(api.get).toHaveBeenCalledWith('/clientes/3/telefonos');
    expect(api.get).toHaveBeenCalledWith('/clientes/3/correos');
    expect(result.current.telefonos).toEqual([{ id_telefono: 1, numero: '55551234' }]);
    expect(result.current.correos).toEqual([{ id_email: 1, correo: 'ana@farmacom.test' }]);
  });

  it('usa listas vacías si la API no devuelve datos', async () => {
    api.get.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useContactosCliente(3));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.telefonos).toEqual([]);
    expect(result.current.correos).toEqual([]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Cliente no encontrado' } } });

    const { result } = renderHook(() => useContactosCliente(3));

    await waitFor(() => expect(result.current.error).toBe('Cliente no encontrado'));
  });

  it('usa un mensaje genérico si el error no trae detalle', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useContactosCliente(3));

    await waitFor(() => expect(result.current.error).toBe('Error al cargar los contactos del cliente'));
  });

  it('limpia los contactos al cambiar a un cliente nulo', async () => {
    responderContactos({ telefonos: [{ id_telefono: 1 }] });
    const { result, rerender } = renderHook(({ id }) => useContactosCliente(id), {
      initialProps: { id: 3 },
    });
    await waitFor(() => expect(result.current.telefonos).toHaveLength(1));

    rerender({ id: null });

    await waitFor(() => expect(result.current.telefonos).toEqual([]));
  });

  it('agrega, actualiza y elimina teléfonos del cliente', async () => {
    responderContactos();
    const { result } = renderHook(() => useContactosCliente(3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_telefono: 1, numero: '55551234' } });
    await act(async () => {
      await result.current.agregarTelefono('5555-1234');
    });
    expect(api.post).toHaveBeenCalledWith('/clientes/3/telefonos', { numero: '5555-1234' });
    expect(result.current.telefonos).toEqual([{ id_telefono: 1, numero: '55551234' }]);

    api.put.mockResolvedValue({ data: { id_telefono: 1, numero: '55559999' } });
    await act(async () => {
      await result.current.actualizarTelefono(1, '55559999');
    });
    expect(api.put).toHaveBeenCalledWith('/clientes/3/telefonos/1', { numero: '55559999' });
    expect(result.current.telefonos).toEqual([{ id_telefono: 1, numero: '55559999' }]);

    api.delete.mockResolvedValue({});
    await act(async () => {
      await result.current.eliminarTelefono(1);
    });
    expect(api.delete).toHaveBeenCalledWith('/clientes/3/telefonos/1');
    expect(result.current.telefonos).toEqual([]);
  });

  it('agrega, actualiza y elimina correos del cliente', async () => {
    responderContactos({ correos: [{ id_email: 9, correo: 'otro@farmacom.test' }] });
    const { result } = renderHook(() => useContactosCliente(3));
    await waitFor(() => expect(result.current.correos).toHaveLength(1));

    api.post.mockResolvedValue({ data: { id_email: 1, correo: 'ana@farmacom.test' } });
    await act(async () => {
      await result.current.agregarCorreo('ana@farmacom.test');
    });
    expect(api.post).toHaveBeenCalledWith('/clientes/3/correos', { correo: 'ana@farmacom.test' });

    api.put.mockResolvedValue({ data: { id_email: 1, correo: 'ana.nueva@farmacom.test' } });
    await act(async () => {
      await result.current.actualizarCorreo(1, 'ana.nueva@farmacom.test');
    });
    expect(api.put).toHaveBeenCalledWith('/clientes/3/correos/1', { correo: 'ana.nueva@farmacom.test' });
    expect(result.current.correos).toEqual([
      { id_email: 9, correo: 'otro@farmacom.test' },
      { id_email: 1, correo: 'ana.nueva@farmacom.test' },
    ]);

    api.delete.mockResolvedValue({});
    await act(async () => {
      await result.current.eliminarCorreo(1);
    });
    expect(api.delete).toHaveBeenCalledWith('/clientes/3/correos/1');
    expect(result.current.correos).toEqual([{ id_email: 9, correo: 'otro@farmacom.test' }]);
  });

  it('propaga el error del backend y conserva la lista si falla una acción', async () => {
    responderContactos({ telefonos: [{ id_telefono: 1, numero: '55551234' }] });
    const { result } = renderHook(() => useContactosCliente(3));
    await waitFor(() => expect(result.current.telefonos).toHaveLength(1));

    const errorDuplicado = { response: { status: 409, data: { mensaje: 'El cliente ya tiene registrado ese teléfono' } } };
    api.post.mockRejectedValue(errorDuplicado);

    await act(async () => {
      await expect(result.current.agregarTelefono('55551234')).rejects.toBe(errorDuplicado);
    });
    expect(result.current.telefonos).toEqual([{ id_telefono: 1, numero: '55551234' }]);
  });
});
