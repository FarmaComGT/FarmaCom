import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  abrirSesion,
  cerrarSesion,
  construirParametrosCaja,
  obtenerCajas,
  obtenerCierres,
  obtenerResumenDiario,
  obtenerSesionActual,
  registrarMovimiento,
} from './cajas';

vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('API de caja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('omite filtros vacíos y campos no permitidos', () => {
    expect(construirParametrosCaja(
      {
        id_sucursal: 2,
        activa: false,
        fecha_desde: '',
        desconocido: 'ignorar',
      },
      ['id_sucursal', 'activa', 'fecha_desde'],
    )).toEqual({ id_sucursal: 2, activa: false });
  });

  it('consulta las cajas con filtros y señal de cancelación', async () => {
    const controller = new AbortController();
    const cajas = [{ id_caja: 3, nombre: 'Caja principal' }];
    api.get.mockResolvedValue({ data: cajas });

    const resultado = await obtenerCajas(
      { id_sucursal: 2, activa: true, fecha_desde: '2026-09-01' },
      { signal: controller.signal },
    );

    expect(api.get).toHaveBeenCalledWith('/cajas', {
      params: { id_sucursal: 2, activa: true },
      signal: controller.signal,
    });
    expect(resultado).toBe(cajas);
  });

  it('consulta la sesión actual de una caja', async () => {
    const sesion = { id_sesion_caja: 9, estado: 'abierta' };
    api.get.mockResolvedValue({ data: sesion });

    const resultado = await obtenerSesionActual(3);

    expect(api.get).toHaveBeenCalledWith('/cajas/3/sesion-actual', undefined);
    expect(resultado).toBe(sesion);
  });

  it('abre una sesión de caja', async () => {
    const datos = { turno: 'mañana', fondo_inicial: '250.00' };
    const sesion = { id_sesion_caja: 9, ...datos };
    api.post.mockResolvedValue({ data: sesion });

    const resultado = await abrirSesion(3, datos);

    expect(api.post).toHaveBeenCalledWith('/cajas/3/sesiones', datos);
    expect(resultado).toBe(sesion);
  });

  it('registra un movimiento en una sesión', async () => {
    const datos = { tipo: 'salida', monto: '25.50', motivo: 'Compra de insumos' };
    const movimiento = { id_movimiento_caja: 12, ...datos };
    api.post.mockResolvedValue({ data: movimiento });

    const resultado = await registrarMovimiento(9, datos);

    expect(api.post).toHaveBeenCalledWith('/cajas/sesiones/9/movimientos', datos);
    expect(resultado).toBe(movimiento);
  });

  it('cierra una sesión de caja', async () => {
    const datos = {
      efectivo_contado: '224.50',
      observaciones: 'Faltante revisado',
    };
    const cierre = { id_sesion_caja: 9, resultado: 'faltante' };
    api.post.mockResolvedValue({ data: cierre });

    const resultado = await cerrarSesion(9, datos);

    expect(api.post).toHaveBeenCalledWith('/cajas/sesiones/9/cierre', datos);
    expect(resultado).toBe(cierre);
  });

  it('consulta cierres usando solamente los filtros admitidos', async () => {
    api.get.mockResolvedValue({ data: [] });

    await obtenerCierres({
      id_sucursal: 2,
      id_caja: 3,
      fecha_desde: '2026-09-01',
      fecha_hasta: '2026-09-22',
      activa: true,
    });

    expect(api.get).toHaveBeenCalledWith('/cajas/cierres', {
      params: {
        id_sucursal: 2,
        id_caja: 3,
        fecha_desde: '2026-09-01',
        fecha_hasta: '2026-09-22',
      },
    });
  });

  it('consulta el resumen diario por fecha y sucursal', async () => {
    const resumen = [{ id_sucursal: 2, sesiones_cerradas: 4 }];
    api.get.mockResolvedValue({ data: resumen });

    const resultado = await obtenerResumenDiario({
      fecha: '2026-09-22',
      id_sucursal: 2,
      id_caja: 3,
    });

    expect(api.get).toHaveBeenCalledWith('/cajas/cierres/resumen-diario', {
      params: { fecha: '2026-09-22', id_sucursal: 2 },
    });
    expect(resultado).toBe(resumen);
  });
});
