import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  crearPagoPOS,
  crearVenta,
  obtenerEstadoPagoPOS,
  obtenerVentaPorId,
} from './ventas';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe('API de ventas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('crearVenta', () => {
    it('crea la venta y devuelve los datos', async () => {
      const venta = { id_venta: 1 };
      api.post.mockResolvedValue({ data: venta });

      const payload = { id_sucursal: 1, detalles: [] };
      await expect(crearVenta(payload)).resolves.toEqual(venta);
      expect(api.post).toHaveBeenCalledWith('/ventas', payload);
    });

    it('traduce el error del backend a un mensaje legible', async () => {
      api.post.mockRejectedValue({ response: { data: { mensaje: 'Stock insuficiente' } } });

      await expect(crearVenta({})).rejects.toThrow('Stock insuficiente');
    });

    it('usa un mensaje genérico si el backend no da uno', async () => {
      api.post.mockRejectedValue({});

      await expect(crearVenta({})).rejects.toThrow('No se pudo registrar la venta.');
    });
  });

  describe('crearPagoPOS', () => {
    it('crea el pago con tarjeta', async () => {
      api.post.mockResolvedValue({ data: { external_id: 'x1' } });

      await expect(crearPagoPOS({ id_venta: 1 })).resolves.toEqual({ external_id: 'x1' });
      expect(api.post).toHaveBeenCalledWith('/ventas/tarjeta/pos', { id_venta: 1 });
    });

    it('traduce el error de terminal en modo espera', async () => {
      api.post.mockRejectedValue({
        response: { data: { mensaje: 'terminal_not_in_standby' } },
      });

      await expect(crearPagoPOS({})).rejects.toThrow(/no está listo para cobrar/);
    });

    it('traduce el error de monto mínimo', async () => {
      api.post.mockRejectedValue({
        response: { data: { mensaje: 'El monto mínimo es Q5.00' } },
      });

      await expect(crearPagoPOS({})).rejects.toThrow(/monto mínimo para pagar con tarjeta es Q5.00/);
    });

    it('usa un mensaje genérico para errores no reconocidos', async () => {
      api.post.mockRejectedValue({ response: { data: { mensaje: 'otro error' } } });

      await expect(crearPagoPOS({})).rejects.toThrow('No se pudo iniciar el pago. Inténtalo de nuevo.');
    });
  });

  describe('obtenerEstadoPagoPOS', () => {
    it('consulta el estado codificando el id externo', async () => {
      api.get.mockResolvedValue({ data: { estado: 'aprobado' } });

      await expect(obtenerEstadoPagoPOS('a/b c')).resolves.toEqual({ estado: 'aprobado' });
      expect(api.get).toHaveBeenCalledWith('/ventas/tarjeta/pos/a%2Fb%20c');
    });

    it('traduce el error al consultar el estado', async () => {
      api.get.mockRejectedValue({});

      await expect(obtenerEstadoPagoPOS('x')).rejects.toThrow(
        'No se pudo verificar el estado del pago.',
      );
    });
  });

  describe('obtenerVentaPorId', () => {
    it('obtiene el comprobante de una venta', async () => {
      api.get.mockResolvedValue({ data: { id_venta: 1 } });

      await expect(obtenerVentaPorId(1)).resolves.toEqual({ id_venta: 1 });
      expect(api.get).toHaveBeenCalledWith('/ventas/1');
    });

    it('traduce el error al cargar el comprobante', async () => {
      api.get.mockRejectedValue({});

      await expect(obtenerVentaPorId(1)).rejects.toThrow(
        'No se pudo cargar el comprobante de la venta.',
      );
    });
  });
});
