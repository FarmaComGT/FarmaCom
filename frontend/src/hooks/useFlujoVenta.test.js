import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearPagoPOS, crearVenta, obtenerEstadoPagoPOS, obtenerVentaPorId } from '../api/ventas.js';
import useFlujoVenta, { construirPayloadVenta } from './useFlujoVenta';

vi.mock('../api/ventas.js', () => ({
  crearPagoPOS: vi.fn(),
  crearVenta: vi.fn(),
  obtenerEstadoPagoPOS: vi.fn(),
  obtenerVentaPorId: vi.fn(),
}));

describe('construirPayloadVenta', () => {
  it('envía exactamente los lotes seleccionados en el carrito', () => {
    const payload = construirPayloadVenta({
      sucursalId: 1,
      sesionCajaId: 9,
      clienteId: null,
      items: [
        { id_producto: 5, id_lote: 12, cantidad: 6 },
        { id_producto: 5, id_lote: 10, cantidad: 2 },
      ],
    });

    expect(payload).toEqual({
      id_sucursal: 1,
      id_sesion_caja: 9,
      id_cliente: null,
      detalles: [
        { id_lote: 12, cantidad: 6 },
        { id_lote: 10, cantidad: 2 },
      ],
    });
  });

  it('construye el detalle de un artículo que representa un lote', () => {
    expect(construirPayloadVenta({
      sucursalId: 1,
      sesionCajaId: 9,
      clienteId: 4,
      items: [{
        id_lote: 7,
        cantidad: 2,
        stock_disponible: 5,
      }],
    }).detalles).toEqual([{ id_lote: 7, cantidad: 2 }]);
  });

  it('rechaza un producto agrupado que no tenga un lote seleccionado', () => {
    expect(() => construirPayloadVenta({
      sucursalId: 1,
      sesionCajaId: 9,
      clienteId: null,
      items: [{ id_producto: 5, cantidad: 2, lotes: [{ id_lote: 7 }] }],
    })).toThrow('El carrito contiene productos sin lote válido.');
  });
});

describe('construirPayloadVenta - validaciones', () => {
  const base = { sucursalId: 1, sesionCajaId: 9, clienteId: undefined, items: [{ id_lote: 1, cantidad: 1 }] };

  it.each([
    ['sin sucursal activa', { sucursalId: null }, 'No hay una sucursal activa para registrar la venta.'],
    ['sin turno de caja', { sesionCajaId: null }, 'Selecciona una caja con un turno abierto antes de procesar la venta.'],
    ['con una cantidad inválida', { items: [{ id_lote: 1, cantidad: 0 }] }, 'El carrito contiene una cantidad inválida.'],
  ])('rechaza el carrito %s', (_caso, cambios, mensaje) => {
    expect(() => construirPayloadVenta({ ...base, ...cambios })).toThrow(mensaje);
  });

  it('usa consumidor final cuando no hay cliente', () => {
    expect(construirPayloadVenta(base).id_cliente).toBeNull();
  });
});

const item = { id_lote: 3, cantidad: 2, estado_vencimiento: 'normal' };
const venta = { id_venta: 40, total: '20.00' };

const crearOpciones = (cambios = {}) => ({
  items: [item],
  sucursalId: 1,
  sesionCajaId: 9,
  clienteId: 5,
  vaciarCarrito: vi.fn(),
  refrescarCatalogo: vi.fn(),
  onAviso: vi.fn(),
  ...cambios,
});

const usarFlujo = (opciones) => renderHook((props) => useFlujoVenta(props), { initialProps: opciones });

const iniciarCobroConTarjeta = async (result) => {
  act(() => result.current.cambiarMetodoPago('tarjeta'));
  act(() => result.current.abrirCobro());
  await act(async () => result.current.iniciarPagoPOS());
};

describe('useFlujoVenta', () => {
  beforeEach(() => vi.clearAllMocks());

  it('avisa si no hay turno de caja abierto al procesar', () => {
    const opciones = crearOpciones({ sesionCajaId: null });
    const { result } = usarFlujo(opciones);

    act(() => result.current.procesarVenta());

    expect(opciones.onAviso).toHaveBeenCalledWith('Selecciona una caja con un turno abierto antes de procesar la venta.');
    expect(result.current.modalActivo).toBeNull();
  });

  it('pide confirmar los productos próximos a vencer antes de cobrar', () => {
    const proximo = { ...item, estado_vencimiento: 'proximo_a_vencer' };
    const { result } = usarFlujo(crearOpciones({ items: [item, proximo] }));

    expect(result.current.itemsProximosAVencer).toEqual([proximo]);
    act(() => result.current.procesarVenta());
    expect(result.current.modalActivo).toBe('confirmar_vencimiento');

    act(() => result.current.cerrarConfirmacion());
    expect(result.current.modalActivo).toBeNull();
  });

  it('abre el cobro directamente si no hay productos por vencer', () => {
    const { result } = usarFlujo(crearOpciones());

    act(() => result.current.procesarVenta());

    expect(result.current.modalActivo).toBe('cobro');
  });

  it('registra la venta en efectivo y muestra el comprobante', async () => {
    const opciones = crearOpciones();
    crearVenta.mockResolvedValue(venta);
    const { result } = usarFlujo(opciones);
    act(() => result.current.abrirCobro());

    await act(async () => result.current.confirmarCobro({ montoRecibido: 50 }));

    expect(crearVenta).toHaveBeenCalledWith({
      id_sucursal: 1,
      id_sesion_caja: 9,
      id_cliente: 5,
      detalles: [{ id_lote: 3, cantidad: 2 }],
      metodo_pago: 'efectivo',
      monto_recibido: 50,
    });
    expect(opciones.vaciarCarrito).toHaveBeenCalledTimes(1);
    expect(opciones.refrescarCatalogo).toHaveBeenCalledTimes(1);
    expect(result.current.modalActivo).toBe('comprobante');
    expect(result.current.ventaCompletada).toEqual(venta);

    act(() => result.current.cerrarComprobante());
    expect(result.current.modalActivo).toBeNull();
    expect(result.current.ventaCompletada).toBeNull();
  });

  it('muestra el error del backend y conserva el carrito si falla el cobro', async () => {
    const opciones = crearOpciones();
    crearVenta.mockRejectedValue(new Error('Stock insuficiente para el lote 3'));
    const { result } = usarFlujo(opciones);

    await act(async () => result.current.confirmarCobro({ montoRecibido: 50 }));

    expect(result.current.errorCobro).toBe('Stock insuficiente para el lote 3');
    expect(result.current.procesandoCobro).toBe(false);
    expect(opciones.vaciarCarrito).not.toHaveBeenCalled();
  });

  it('usa un mensaje genérico si el cobro falla sin detalle', async () => {
    crearVenta.mockRejectedValue(new Error(''));
    const { result } = usarFlujo(crearOpciones());

    await act(async () => result.current.confirmarCobro());

    expect(result.current.errorCobro).toBe('No se pudo registrar la venta.');
  });

  it('no registra en efectivo una venta con tarjeta', async () => {
    const { result } = usarFlujo(crearOpciones());
    act(() => result.current.cambiarMetodoPago('tarjeta'));

    await act(async () => result.current.confirmarCobro());

    expect(result.current.errorCobro).toBe('Los pagos con tarjeta deben confirmarse desde el POS.');
    expect(crearVenta).not.toHaveBeenCalled();
  });

  it('pide elegir tarjeta antes de enviar el cobro al POS', async () => {
    const { result } = usarFlujo(crearOpciones());

    await act(async () => result.current.iniciarPagoPOS());

    expect(result.current.errorCobro).toBe('Selecciona tarjeta para enviar el cobro al POS.');
    expect(crearPagoPOS).not.toHaveBeenCalled();
  });

  it('informa si el POS no devolvió un identificador de pago', async () => {
    crearPagoPOS.mockResolvedValue({});
    const { result } = usarFlujo(crearOpciones());

    await iniciarCobroConTarjeta(result);

    expect(result.current.errorCobro).toBe('No se pudo iniciar el pago. Inténtalo de nuevo.');
    expect(result.current.pagoPOS).toBeNull();
  });

  it('usa un mensaje genérico si el POS rechaza el envío sin detalle', async () => {
    crearPagoPOS.mockRejectedValue(new Error(''));
    const { result } = usarFlujo(crearOpciones());

    await iniciarCobroConTarjeta(result);

    expect(result.current.errorCobro).toBe('No se pudo enviar el cobro al POS.');
  });

  it('completa la venta cuando el POS confirma el pago', async () => {
    const opciones = crearOpciones();
    crearPagoPOS.mockResolvedValue({ external_id: 'farmacom-pos-1', estado: 'pendiente' });
    obtenerEstadoPagoPOS.mockResolvedValue({ estado: 'pagado', id_venta: 40 });
    obtenerVentaPorId.mockResolvedValue(venta);
    const { result } = usarFlujo(opciones);

    await iniciarCobroConTarjeta(result);

    await waitFor(() => expect(result.current.modalActivo).toBe('comprobante'));
    expect(obtenerEstadoPagoPOS).toHaveBeenCalledWith('farmacom-pos-1');
    expect(obtenerVentaPorId).toHaveBeenCalledWith(40);
    expect(result.current.ventaCompletada).toEqual(venta);
    expect(opciones.vaciarCarrito).toHaveBeenCalledTimes(1);
  });

  it('no deja cerrar ni reenviar el cobro mientras espera la confirmación del POS', async () => {
    crearPagoPOS.mockResolvedValue({ external_id: 'farmacom-pos-1', estado: 'pendiente' });
    obtenerEstadoPagoPOS.mockResolvedValue({ estado: 'pendiente' });
    const { result } = usarFlujo(crearOpciones());
    await iniciarCobroConTarjeta(result);

    act(() => result.current.cerrarCobro());
    await act(async () => result.current.iniciarPagoPOS());

    expect(result.current.modalActivo).toBe('cobro');
    expect(crearPagoPOS).toHaveBeenCalledTimes(1);
  });

  it.each(['rechazado', 'cancelado', 'fallido'])('permite reintentar si el POS reporta el pago %s', async (estado) => {
    crearPagoPOS.mockResolvedValue({ external_id: 'farmacom-pos-1', estado: 'pendiente' });
    obtenerEstadoPagoPOS.mockResolvedValue({ estado });
    const { result } = usarFlujo(crearOpciones());

    await iniciarCobroConTarjeta(result);

    await waitFor(() => expect(result.current.errorCobro).toBe('El pago no se completó. Puedes intentarlo nuevamente.'));
    expect(result.current.pagoPOS).toBeNull();
  });

  it('muestra el error si no puede verificar el estado del pago', async () => {
    crearPagoPOS.mockResolvedValue({ external_id: 'farmacom-pos-1', estado: 'pendiente' });
    obtenerEstadoPagoPOS.mockRejectedValue(new Error(''));
    const { result } = usarFlujo(crearOpciones());

    await iniciarCobroConTarjeta(result);

    await waitFor(() => expect(result.current.errorCobro).toBe('No se pudo verificar el estado del pago.'));
  });

  it('muestra el error si no puede cargar el comprobante del pago aprobado', async () => {
    crearPagoPOS.mockResolvedValue({ external_id: 'farmacom-pos-1', estado: 'pendiente' });
    obtenerEstadoPagoPOS.mockResolvedValue({ estado: 'pagado', id_venta: 40 });
    obtenerVentaPorId.mockRejectedValue(new Error(''));
    const { result } = usarFlujo(crearOpciones());

    await iniciarCobroConTarjeta(result);

    await waitFor(() => expect(result.current.errorCobro).toBe('No se pudo cargar el comprobante de la venta.'));
  });

  it('cierra el cobro y limpia el error cuando no hay pago pendiente', async () => {
    crearVenta.mockRejectedValue(new Error('Monto insuficiente'));
    const { result } = usarFlujo(crearOpciones());
    act(() => result.current.abrirCobro());
    await act(async () => result.current.confirmarCobro());

    act(() => result.current.cerrarCobro());

    expect(result.current.modalActivo).toBeNull();
    expect(result.current.errorCobro).toBeNull();
  });
});
