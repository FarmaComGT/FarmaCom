import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PuntoVenta from './PuntoVenta';
import {
  crearPagoPOS,
  crearVenta,
  obtenerEstadoPagoPOS,
  obtenerVentaPorId,
} from '../../api/ventas';
import useCaja from '../../hooks/useCaja';

const productoNormal = {
  carritoKey: 'lote-1-presentacion-1',
  clave: 'lote-1-presentacion-1',
  id_producto: 1,
  id_lote: 1,
  nombre_comercial: 'Paracetamol',
  numero_lote: 'L-001',
  fecha_vencimiento: '2027-01-01',
  stock_disponible: 5,
  precio_venta: 8.5,
  tiene_precio: true,
  estado_vencimiento: 'normal',
};

const productoProximoAVencer = {
  carritoKey: 'lote-2-presentacion-1',
  clave: 'lote-2-presentacion-1',
  id_producto: 2,
  id_lote: 2,
  nombre_comercial: 'Ibuprofeno',
  numero_lote: 'L-002',
  fecha_vencimiento: '2026-08-01',
  stock_disponible: 5,
  precio_venta: 12,
  tiene_precio: true,
  estado_vencimiento: 'proximo_a_vencer',
};

let carritoItems = [];
const agregarAlCarrito = vi.fn((producto, opciones = {}) => {
  carritoItems.push({
    ...producto,
    clave: producto.carritoKey,
    cantidad: 1,
    precioUnitario: opciones.precioUnitario,
  });
});
const vaciarCarrito = vi.fn(() => {
  carritoItems = [];
});
const refrescarCatalogo = vi.fn();
const mockCrearCliente = vi.fn();

vi.mock('../../api/ventas', () => ({
  crearPagoPOS: vi.fn(),
  crearVenta: vi.fn(),
  obtenerEstadoPagoPOS: vi.fn(),
  obtenerVentaPorId: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ sucursalActivaId: 1 }),
}));

vi.mock('../../context/CarritoContext', () => ({
  useCarrito: () => ({
    items: carritoItems,
    cantidadTotal: carritoItems.length,
    total: carritoItems.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0),
    agregarAlCarrito,
    actualizarCantidad: vi.fn(),
    incrementarCantidad: vi.fn(),
    disminuirCantidad: vi.fn(),
    eliminarDelCarrito: vi.fn(),
    vaciarCarrito,
  }),
}));

let productosCatalogo = [];
vi.mock('../../hooks/useAutocompletadoPOS', () => ({
  default: () => ({
    productos: productosCatalogo,
    cargando: false,
    error: null,
    refrescar: refrescarCatalogo,
    buscarAhora: vi.fn(async () => productosCatalogo),
  }),
}));

vi.mock('../../hooks/useClientes', () => ({
  default: () => ({
    clientes: [{ id_cliente: 1, nombre_cliente: 'Maria Lopez' }],
    cargando: false,
    crear: mockCrearCliente,
  }),
}));

vi.mock('../../hooks/useCaja', () => ({
  default: vi.fn(),
}));

describe('PuntoVenta', () => {
  beforeEach(() => {
    carritoItems = [];
    productosCatalogo = [];
    useCaja.mockReturnValue({
      cajas: [{ id_caja: 3, nombre: 'Caja principal', id_sesion_abierta: 9 }],
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal', id_sesion_abierta: 9 },
      idCajaSeleccionada: 3,
      sesionActual: { id_sesion_caja: 9, turno: 'mañana' },
      cargandoCajas: false,
      cargandoSesion: false,
      error: null,
      seleccionarCaja: vi.fn(),
    });
    agregarAlCarrito.mockClear();
    vaciarCarrito.mockClear();
    refrescarCatalogo.mockClear();
    mockCrearCliente.mockReset();
    mockCrearCliente.mockResolvedValue({
      id_cliente: 2,
      nombre_cliente: 'Ana Pérez',
      observaciones: null,
    });
    crearPagoPOS.mockReset();
    crearPagoPOS.mockResolvedValue({
      id_pago_pos: 5,
      external_id: 'farmacom-pos-test',
      estado: 'pendiente',
      total: '17.00',
      moneda: 'GTQ',
    });
    obtenerEstadoPagoPOS.mockReset();
    obtenerEstadoPagoPOS.mockResolvedValue({
      id_pago_pos: 5,
      external_id: 'farmacom-pos-test',
      estado: 'pendiente',
      total: '17.00',
    });
    obtenerVentaPorId.mockReset();
    crearVenta.mockReset();
    crearVenta.mockResolvedValue({
      id_venta: 15,
      total: '17.00',
      monto_recibido: '20.00',
      cambio: '3.00',
      metodo_pago: 'efectivo',
      fecha_venta: '2026-01-01T12:00:00.000Z',
      nombre_sucursal: 'Sucursal Central',
      nombre_usuario: 'Dueno General',
      nombre_cliente: null,
      detalles: [
        {
          id_detalle_venta: 1,
          nombre_comercial: 'Paracetamol',
          cantidad: 2,
          precio_unitario: '8.50',
          subtotal: '17.00',
        },
      ],
    });
  });

  it('renderiza el catalogo, el carrito y el selector de cliente con "Consumidor final" por defecto', () => {
    render(<PuntoVenta />);

    expect(screen.getByText('Buscar productos')).toBeInTheDocument();
    expect(screen.getByText('Caja / salida')).toBeInTheDocument();
    expect(screen.getByText(/El carrito est. vac.o/)).toBeInTheDocument();
    expect(screen.getByText('Consumidor final')).toBeInTheDocument();
  });

  it('permite seleccionar un cliente existente', async () => {
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByText('Consumidor final'));
    await user.click(screen.getByText('Maria Lopez'));

    expect(screen.getByText('Maria Lopez')).toBeInTheDocument();
  });

  it('permite agregar y seleccionar un cliente nuevo sin salir del punto de venta', async () => {
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Agregar cliente' }));
    expect(screen.getByRole('dialog', { name: 'Nuevo cliente' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nombre completo'), '  Ana Pérez  ');
    await user.click(screen.getByRole('button', { name: 'Agregar y seleccionar' }));

    await waitFor(() => {
      expect(mockCrearCliente).toHaveBeenCalledWith({
        nombre_cliente: 'Ana Pérez',
        nit: null,
        observaciones: null,
      });
    });

    expect(screen.queryByRole('dialog', { name: 'Nuevo cliente' })).not.toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
  });

  it('pide confirmacion antes de agregar un producto proximo a vencer', async () => {
    productosCatalogo = [productoProximoAVencer];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.type(screen.getByLabelText('Buscar productos'), 'ibuprofeno');
    await user.click(screen.getByText('Ibuprofeno'));

    expect(screen.getByText(/Producto pr.ximo a vencer/)).toBeInTheDocument();
    expect(agregarAlCarrito).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /S., continuar/ }));

    expect(agregarAlCarrito).toHaveBeenCalledWith(
      productoProximoAVencer,
      { precioUnitario: productoProximoAVencer.precio_venta },
    );
  });

  it('agrega directo al carrito un producto sin alerta de vencimiento', async () => {
    productosCatalogo = [productoNormal];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.type(screen.getByLabelText('Buscar productos'), 'paracetamol');
    await user.click(screen.getByText('Paracetamol'));

    expect(agregarAlCarrito).toHaveBeenCalledWith(
      productoNormal,
      { precioUnitario: productoNormal.precio_venta },
    );
    expect(screen.queryByText(/Producto pr.ximo a vencer/)).not.toBeInTheDocument();
  });

  it('avisa antes de cobrar una venta con productos proximos a vencer en el carrito', async () => {
    carritoItems = [{ ...productoProximoAVencer, cantidad: 1, precioUnitario: 12 }];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));

    expect(screen.getByText(/Venta con productos pr.ximos a vencer/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /S., continuar/ }));

    expect(screen.getByText('Cobro de venta')).toBeInTheDocument();
  });

  it('impide procesar una venta sin una sesión de caja abierta', async () => {
    carritoItems = [{ ...productoNormal, cantidad: 1, precioUnitario: 8.5 }];
    useCaja.mockReturnValue({
      cajas: [{ id_caja: 3, nombre: 'Caja principal', id_sesion_abierta: null }],
      cajaSeleccionada: { id_caja: 3, nombre: 'Caja principal' },
      idCajaSeleccionada: 3,
      sesionActual: null,
      cargandoCajas: false,
      cargandoSesion: false,
      error: null,
      seleccionarCaja: vi.fn(),
    });
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));

    expect(screen.getByText(
      'Selecciona una caja con un turno abierto antes de procesar la venta.',
    )).toBeInTheDocument();
    expect(screen.queryByText('Cobro de venta')).not.toBeInTheDocument();
  });

  it('registra una venta en efectivo desde el modal de cobro', async () => {
    carritoItems = [{ ...productoNormal, cantidad: 2, precioUnitario: 8.5 }];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));
    await user.clear(screen.getByLabelText('Monto recibido'));
    await user.type(screen.getByLabelText('Monto recibido'), '20');
    await user.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    await waitFor(() => {
      expect(crearVenta).toHaveBeenCalledWith({
        id_sucursal: 1,
        id_sesion_caja: 9,
        id_cliente: null,
        metodo_pago: 'efectivo',
        monto_recibido: 20,
        detalles: [{ id_lote: 1, cantidad: 2 }],
      });
    });

    expect(vaciarCarrito).toHaveBeenCalled();
    expect(refrescarCatalogo).toHaveBeenCalled();
    expect(screen.getByText('Venta registrada')).toBeInTheDocument();
    expect(screen.getByText(/Comprobante #15/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir comprobante' })).toBeInTheDocument();
  });

  it('envia el cobro al POS para que el webhook confirme la venta', async () => {
    carritoItems = [{ ...productoNormal, cantidad: 2, precioUnitario: 8.5 }];
    crearVenta.mockResolvedValue({
      id_venta: 16,
      metodo_pago: 'tarjeta',
      cambio: '0.00',
    });
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));
    await user.click(screen.getByRole('button', { name: 'Cobrar con tarjeta' }));

    await waitFor(() => {
      expect(crearPagoPOS).toHaveBeenCalledWith({
        id_sucursal: 1,
        id_sesion_caja: 9,
        id_cliente: null,
        detalles: [{ id_lote: 1, cantidad: 2 }],
      });
    });

    expect(screen.queryByText('farmacom-pos-test')).not.toBeInTheDocument();
    expect(screen.getByText(/La venta se registrar.*automáticamente/)).toBeInTheDocument();
    expect(crearVenta).not.toHaveBeenCalled();
  });

  it('deshabilita el boton mientras envia el comando al POS', async () => {
    let resolverPago;
    crearPagoPOS.mockImplementation(() => new Promise((resolve) => {
      resolverPago = resolve;
    }));
    carritoItems = [{ ...productoNormal, cantidad: 1, precioUnitario: 8.5 }];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));
    const botonPOS = screen.getByRole('button', { name: 'Cobrar con tarjeta' });
    await user.click(botonPOS);

    await waitFor(() => {
      expect(crearPagoPOS).toHaveBeenCalledTimes(1);
    });
    expect(botonPOS).toBeDisabled();

    resolverPago({
      id_pago_pos: 6,
      external_id: 'farmacom-pos-test-2',
      estado: 'pendiente',
    });

    await waitFor(() => {
      expect(screen.getByText(/La venta se registrar.*automáticamente/)).toBeInTheDocument();
    });
  });

  it('consulta el pago y muestra el comprobante cuando el webhook lo confirma', async () => {
    const ventaPOS = {
      id_venta: 22,
      total: '8.50',
      monto_recibido: '8.50',
      cambio: '0.00',
      metodo_pago: 'tarjeta',
      fecha_venta: '2026-09-05T12:00:00.000Z',
      nombre_sucursal: 'Sucursal Central',
      nombre_usuario: 'Dueno General',
      nombre_cliente: null,
      detalles: [
        {
          id_detalle_venta: 7,
          nombre_comercial: 'Paracetamol',
          cantidad: 1,
          precio_unitario: '8.50',
          subtotal: '8.50',
        },
      ],
    };
    obtenerEstadoPagoPOS.mockResolvedValue({
      id_pago_pos: 5,
      external_id: 'farmacom-pos-test',
      estado: 'pagado',
      id_venta: 22,
    });
    obtenerVentaPorId.mockResolvedValue(ventaPOS);
    carritoItems = [{ ...productoNormal, cantidad: 1, precioUnitario: 8.5 }];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));
    await user.click(screen.getByRole('button', { name: 'Cobrar con tarjeta' }));

    await waitFor(() => {
      expect(obtenerEstadoPagoPOS).toHaveBeenCalledWith('farmacom-pos-test');
      expect(obtenerVentaPorId).toHaveBeenCalledWith(22);
      expect(vaciarCarrito).toHaveBeenCalled();
      expect(refrescarCatalogo).toHaveBeenCalled();
      expect(screen.getByText('Venta registrada')).toBeInTheDocument();
    });

    expect(screen.getByText(/Comprobante #22/)).toBeInTheDocument();
  });

  it('permite intentar nuevamente cuando el pago es rechazado', async () => {
    obtenerEstadoPagoPOS.mockResolvedValue({
      id_pago_pos: 5,
      external_id: 'farmacom-pos-test',
      estado: 'rechazado',
    });
    carritoItems = [{ ...productoNormal, cantidad: 1, precioUnitario: 8.5 }];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));
    await user.click(screen.getByRole('button', { name: 'Cobrar con tarjeta' }));

    expect(await screen.findByText(/El pago no se completó/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cobrar con tarjeta' })).toBeEnabled();
    expect(vaciarCarrito).not.toHaveBeenCalled();
  });

  it('muestra el error del backend si no se puede enviar el cobro al POS', async () => {
    crearPagoPOS.mockRejectedValue(new Error('El dispositivo no está listo para cobrar. Verifica que esté abierto e inténtalo de nuevo.'));
    carritoItems = [{ ...productoNormal, cantidad: 1, precioUnitario: 8.5 }];
    const user = userEvent.setup();
    render(<PuntoVenta />);

    await user.click(screen.getByRole('button', { name: 'Tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));
    await user.click(screen.getByRole('button', { name: 'Cobrar con tarjeta' }));

    expect(await screen.findByText(/El dispositivo no está listo para cobrar/)).toBeInTheDocument();
    expect(crearVenta).not.toHaveBeenCalled();
  });
});
