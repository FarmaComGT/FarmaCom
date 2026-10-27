import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as almacenamientoLocal from '../utils/almacenamientoLocal';
import useAlmacenamientoLocal from './useAlmacenamientoLocal';

vi.mock('../utils/almacenamientoLocal', () => ({
  soportaAlmacenamientoLocal: vi.fn(),
  obtenerCarpetaRaiz: vi.fn(),
  guardarCarpetaRaiz: vi.fn(),
  verificarPermiso: vi.fn(),
  solicitarPermiso: vi.fn(),
  elegirCarpetaRaiz: vi.fn(),
  crearCarpetaPaciente: vi.fn(),
  eliminarCarpetaPaciente: vi.fn(),
  eliminarRespaldosPorPaciente: vi.fn(),
  guardarPdfLocal: vi.fn(),
  registrarRespaldo: vi.fn(),
  listarRespaldosPorPaciente: vi.fn(),
  obtenerArchivoLocal: vi.fn(),
  nombreArchivoResultado: vi.fn(),
}));

describe('useAlmacenamientoLocal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no verifica estado cuando el navegador no soporta el almacenamiento local', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);

    const { result } = renderHook(() => useAlmacenamientoLocal());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.soportado).toBe(false);
    expect(result.current.carpetaConfigurada).toBe(false);
    expect(almacenamientoLocal.obtenerCarpetaRaiz).not.toHaveBeenCalled();
  });

  it('carga la carpeta raíz y verifica el permiso al montar', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    const handleFalso = {};
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue(handleFalso);
    almacenamientoLocal.verificarPermiso.mockResolvedValue('granted');

    const { result } = renderHook(() => useAlmacenamientoLocal());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.carpetaConfigurada).toBe(true);
    expect(result.current.permisoOk).toBe(true);
    expect(almacenamientoLocal.verificarPermiso).toHaveBeenCalledWith(handleFalso);
  });

  it('marca permisoOk en false cuando no hay carpeta configurada', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue(null);

    const { result } = renderHook(() => useAlmacenamientoLocal());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.carpetaConfigurada).toBe(false);
    expect(result.current.permisoOk).toBe(false);
    expect(almacenamientoLocal.verificarPermiso).not.toHaveBeenCalled();
  });

  it('marca permisoOk en false cuando el permiso no está concedido', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue({});
    almacenamientoLocal.verificarPermiso.mockResolvedValue('prompt');

    const { result } = renderHook(() => useAlmacenamientoLocal());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.permisoOk).toBe(false);
  });

  it('elige una carpeta nueva y actualiza el estado', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);
    const handleFalso = {};
    almacenamientoLocal.elegirCarpetaRaiz.mockResolvedValue(handleFalso);

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.elegirCarpeta();
    });

    expect(result.current.carpetaConfigurada).toBe(true);
    expect(result.current.permisoOk).toBe(true);
  });

  it('reconecta exitosamente cuando el permiso es concedido', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    const handleFalso = {};
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue(handleFalso);
    almacenamientoLocal.verificarPermiso.mockResolvedValue('prompt');
    almacenamientoLocal.solicitarPermiso.mockResolvedValue('granted');

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.permisoOk).toBe(false);

    let ok;
    await act(async () => {
      ok = await result.current.reconectar();
    });

    expect(ok).toBe(true);
    expect(result.current.permisoOk).toBe(true);
  });

  it('reconectar devuelve false si no hay carpeta configurada', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    let ok;
    await act(async () => {
      ok = await result.current.reconectar();
    });

    expect(ok).toBe(false);
    expect(almacenamientoLocal.solicitarPermiso).not.toHaveBeenCalled();
  });

  it('crea la carpeta del paciente cuando hay permiso', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue({});
    almacenamientoLocal.verificarPermiso.mockResolvedValue('granted');

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.crearCarpetaDePaciente(1, 'Juan');
    });

    expect(almacenamientoLocal.crearCarpetaPaciente).toHaveBeenCalledWith({}, 1, 'Juan');
  });

  it('no intenta crear la carpeta del paciente sin permiso', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.crearCarpetaDePaciente(1, 'Juan');
    });

    expect(almacenamientoLocal.crearCarpetaPaciente).not.toHaveBeenCalled();
  });

  it('no bloquea el flujo si falla la creación de la carpeta del paciente', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue({});
    almacenamientoLocal.verificarPermiso.mockResolvedValue('granted');
    almacenamientoLocal.crearCarpetaPaciente.mockRejectedValue(new Error('fallo de disco'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await expect(result.current.crearCarpetaDePaciente(1, 'Juan')).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('elimina la carpeta del paciente y sus respaldos cuando hay permiso', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    const raizHandle = {};
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue(raizHandle);
    almacenamientoLocal.verificarPermiso.mockResolvedValue('granted');
    almacenamientoLocal.eliminarRespaldosPorPaciente.mockResolvedValue();
    almacenamientoLocal.eliminarCarpetaPaciente.mockResolvedValue();

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.eliminarCarpetaDePaciente(1, 'Juan');
    });

    expect(almacenamientoLocal.eliminarRespaldosPorPaciente).toHaveBeenCalledWith(1);
    expect(almacenamientoLocal.eliminarCarpetaPaciente).toHaveBeenCalledWith(raizHandle, 1, 'Juan');
  });

  it('limpia los respaldos pero no intenta borrar la carpeta sin permiso', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);
    almacenamientoLocal.eliminarRespaldosPorPaciente.mockResolvedValue();

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.eliminarCarpetaDePaciente(1, 'Juan');
    });

    expect(almacenamientoLocal.eliminarRespaldosPorPaciente).toHaveBeenCalledWith(1);
    expect(almacenamientoLocal.eliminarCarpetaPaciente).not.toHaveBeenCalled();
  });

  it('no bloquea el flujo si falla la limpieza local al eliminar un paciente', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue({});
    almacenamientoLocal.verificarPermiso.mockResolvedValue('granted');
    almacenamientoLocal.eliminarRespaldosPorPaciente.mockRejectedValue(new Error('fallo indexeddb'));
    almacenamientoLocal.eliminarCarpetaPaciente.mockRejectedValue(new Error('fallo de disco'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await expect(result.current.eliminarCarpetaDePaciente(1, 'Juan')).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledTimes(2);

    consoleError.mockRestore();
  });

  it('guarda un respaldo completo cuando hay permiso', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    const raizHandle = {};
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue(raizHandle);
    almacenamientoLocal.verificarPermiso.mockResolvedValue('granted');
    const carpetaPaciente = {};
    almacenamientoLocal.crearCarpetaPaciente.mockResolvedValue(carpetaPaciente);
    almacenamientoLocal.nombreArchivoResultado.mockReturnValue('2026-01-01_Lab_1.pdf');
    almacenamientoLocal.guardarPdfLocal.mockResolvedValue();
    almacenamientoLocal.registrarRespaldo.mockResolvedValue();

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    const paciente = { id_paciente: 1, nombre_paciente: 'Juan' };
    const resultadoLab = {
      id_resultado: 10,
      categoria: 'Laboratorio',
      fecha_subida: '2026-01-01',
      token_publico: 'abc',
    };
    const bytes = new Uint8Array([1]);

    let ok;
    await act(async () => {
      ok = await result.current.guardarRespaldo(paciente, resultadoLab, bytes);
    });

    expect(ok).toBe(true);
    expect(almacenamientoLocal.guardarPdfLocal).toHaveBeenCalledWith(
      carpetaPaciente,
      '2026-01-01_Lab_1.pdf',
      bytes,
    );
    expect(almacenamientoLocal.registrarRespaldo).toHaveBeenCalledWith({
      id_resultado: 10,
      id_paciente: 1,
      nombre_paciente: 'Juan',
      categoria: 'Laboratorio',
      fecha_subida: '2026-01-01',
      token_publico: 'abc',
      nombre_archivo: '2026-01-01_Lab_1.pdf',
    });
  });

  it('guardarRespaldo devuelve false sin permiso', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    let ok;
    await act(async () => {
      ok = await result.current.guardarRespaldo({}, {}, new Uint8Array());
    });

    expect(ok).toBe(false);
    expect(almacenamientoLocal.guardarPdfLocal).not.toHaveBeenCalled();
  });

  it('respaldosDe delega en listarRespaldosPorPaciente', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);
    almacenamientoLocal.listarRespaldosPorPaciente.mockResolvedValue([{ id_resultado: 1 }]);

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await expect(result.current.respaldosDe(5)).resolves.toEqual([{ id_resultado: 1 }]);
    expect(almacenamientoLocal.listarRespaldosPorPaciente).toHaveBeenCalledWith(5);
  });

  it('abre el archivo local en una nueva pestaña', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(true);
    const raizHandle = {};
    almacenamientoLocal.obtenerCarpetaRaiz.mockResolvedValue(raizHandle);
    almacenamientoLocal.verificarPermiso.mockResolvedValue('granted');
    const archivoFalso = {};
    almacenamientoLocal.obtenerArchivoLocal.mockResolvedValue(archivoFalso);

    const urlFalsa = 'blob:falso';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(urlFalsa);
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => {});

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    const respaldo = {
      id_paciente: 1,
      nombre_paciente: 'Juan',
      nombre_archivo: 'a.pdf',
    };

    await act(async () => {
      await result.current.abrirArchivoLocal(respaldo);
    });

    expect(almacenamientoLocal.obtenerArchivoLocal).toHaveBeenCalledWith(
      raizHandle,
      1,
      'Juan',
      'a.pdf',
    );
    expect(windowOpen).toHaveBeenCalledWith(urlFalsa, '_blank', 'noopener');

    windowOpen.mockRestore();
    URL.createObjectURL.mockRestore();
  });

  it('no abre el archivo si no hay carpeta raíz configurada', async () => {
    almacenamientoLocal.soportaAlmacenamientoLocal.mockReturnValue(false);

    const { result } = renderHook(() => useAlmacenamientoLocal());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.abrirArchivoLocal({});
    });

    expect(almacenamientoLocal.obtenerArchivoLocal).not.toHaveBeenCalled();
  });
});
