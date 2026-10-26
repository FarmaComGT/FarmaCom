import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VentaDetalleModal from './VentaDetalleModal';

const mocks = vi.hoisted(() => ({
  anularVenta: vi.fn(),
  obtenerVentaPorId: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('../../../api/ventas', () => ({
  anularVenta: mocks.anularVenta,
  obtenerVentaPorId: mocks.obtenerVentaPorId,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

const ventaBase = {
  id_venta: 21,
  id_usuario: 7,
  nombre_usuario: 'Juan Dependiente',
  nombre_sucursal: 'Sucursal Central',
  nombre_cliente: null,
  metodo_pago: 'efectivo',
  total: 25,
  estado: 'completada',
  fecha_venta: '2026-10-20T15:00:00.000Z',
  detalles: [{
    id_detalle_venta: 1,
    nombre_comercial: 'Producto A',
    cantidad: 1,
    precio_unitario: 25,
    subtotal: 25,
  }],
};

describe('VentaDetalleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({
      usuario: { id_usuario: 1, rol: 'administrador' },
    });
    mocks.obtenerVentaPorId.mockResolvedValue(ventaBase);
  });

  it('permite confirmar la anulación y muestra quién y cuándo la realizó', async () => {
    const user = userEvent.setup();
    const onVentaAnulada = vi.fn();
    const ventaAnulada = {
      ...ventaBase,
      estado: 'anulada',
      motivo_anulacion: 'Error de cobro',
      fecha_anulacion: '2026-10-21T14:30:00.000Z',
      nombre_usuario_anulacion: 'Ana Administradora',
    };
    mocks.anularVenta.mockResolvedValue(ventaAnulada);

    render(
      <VentaDetalleModal
        idVenta={21}
        onClose={vi.fn()}
        onVentaAnulada={onVentaAnulada}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Anular venta' }));
    await user.type(screen.getByLabelText(/Motivo de anulación/), 'Error de cobro');
    await user.click(screen.getByRole('button', { name: 'Sí, anular venta' }));

    await waitFor(() => {
      expect(mocks.anularVenta).toHaveBeenCalledWith(21, 'Error de cobro');
    });
    const datosAnulacion = await screen.findByRole('region', { name: 'Datos de anulación' });
    expect(within(datosAnulacion).getByText('Ana Administradora')).toBeInTheDocument();
    expect(within(datosAnulacion).getByText('Error de cobro')).toBeInTheDocument();
    expect(within(datosAnulacion).getByText('Fecha de anulación')).toBeInTheDocument();
    expect(onVentaAnulada).toHaveBeenCalledWith(ventaAnulada);
  });

  it('muestra la advertencia de tarjeta sin llamar al endpoint de anulación', async () => {
    const user = userEvent.setup();
    mocks.obtenerVentaPorId.mockResolvedValue({
      ...ventaBase,
      metodo_pago: 'tarjeta',
      tarjeta_ultimos4: '4242',
    });

    render(<VentaDetalleModal idVenta={21} onClose={vi.fn()} />);

    expect(await screen.findByText(/requieren un reembolso en Recurrente/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver indicaciones de reembolso' }));

    expect(screen.getByRole('dialog', { name: 'Venta con tarjeta' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/no se puede anular desde FarmaCom/i);
    expect(mocks.anularVenta).not.toHaveBeenCalled();
  });

  it('impide que un dependiente intente anular una venta de otro responsable', async () => {
    mocks.useAuth.mockReturnValue({
      usuario: { id_usuario: 9, rol: 'dependiente' },
    });

    render(<VentaDetalleModal idVenta={21} onClose={vi.fn()} />);

    expect(await screen.findByText(/Solo el responsable de la venta/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular venta' })).not.toBeInTheDocument();
  });

  it('no consulta ni muestra nada sin una venta seleccionada', () => {
    const { container } = render(<VentaDetalleModal idVenta={null} onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(mocks.obtenerVentaPorId).not.toHaveBeenCalled();
  });

  it('muestra el estado de carga y luego los datos de la venta', async () => {
    mocks.obtenerVentaPorId.mockResolvedValue({ ...ventaBase, nombre_cliente: 'María López', fecha_venta: null });

    render(<VentaDetalleModal idVenta={21} onClose={vi.fn()} />);

    expect(screen.getByRole('status', { name: 'Cargando detalle de venta' })).toBeInTheDocument();
    expect(await screen.findByText('María López')).toBeInTheDocument();
    expect(screen.getByText('No disponible')).toBeInTheDocument();
    expect(mocks.obtenerVentaPorId).toHaveBeenCalledWith(21);
  });

  it('muestra el error si no se pudo cargar la venta', async () => {
    mocks.obtenerVentaPorId.mockRejectedValue(new Error('Venta no encontrada'));

    render(<VentaDetalleModal idVenta={99} onClose={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Venta no encontrada');
    expect(screen.queryByRole('button', { name: 'Anular venta' })).not.toBeInTheDocument();
  });

  it('permite al dependiente responsable cancelar su venta', async () => {
    const user = userEvent.setup();
    mocks.useAuth.mockReturnValue({ usuario: { id_usuario: 7, rol: 'dependiente' } });

    render(<VentaDetalleModal idVenta={21} onClose={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Anular venta' }));
    expect(screen.getByRole('button', { name: 'Sí, anular venta' })).toBeInTheDocument();
  });

  it('mantiene la confirmación abierta y muestra el error si la cancelación falla', async () => {
    const user = userEvent.setup();
    mocks.anularVenta.mockRejectedValue(new Error('No se puede anular una venta con la sesión de caja cerrada'));

    render(<VentaDetalleModal idVenta={21} onClose={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Anular venta' }));
    await user.type(screen.getByLabelText(/Motivo de anulación/), 'Error de cobro');
    await user.click(screen.getByRole('button', { name: 'Sí, anular venta' }));

    expect(await screen.findByText('No se puede anular una venta con la sesión de caja cerrada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sí, anular venta' })).toBeEnabled();
  });

  it('usa un mensaje genérico si la cancelación falla sin detalle', async () => {
    const user = userEvent.setup();
    mocks.anularVenta.mockRejectedValue(new Error(''));

    render(<VentaDetalleModal idVenta={21} onClose={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Anular venta' }));
    await user.type(screen.getByLabelText(/Motivo de anulación/), 'Error de cobro');
    await user.click(screen.getByRole('button', { name: 'Sí, anular venta' }));

    expect(await screen.findByText('No se pudo anular la venta.')).toBeInTheDocument();
  });

  it('vuelve al detalle sin cancelar la venta', async () => {
    const user = userEvent.setup();

    render(<VentaDetalleModal idVenta={21} onClose={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Anular venta' }));
    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.queryByRole('button', { name: 'Sí, anular venta' })).not.toBeInTheDocument();
    expect(mocks.anularVenta).not.toHaveBeenCalled();
  });

  it('cierra el detalle con el botón o al hacer clic fuera del cuadro', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<VentaDetalleModal idVenta={21} onClose={onClose} />);
    await screen.findByText('Sucursal Central');

    await user.click(screen.getByRole('button', { name: 'Cerrar detalle de venta' }));
    await user.click(screen.getByRole('dialog', { name: /Detalle de venta/ }).parentElement);
    await user.click(screen.getByText('Sucursal Central'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
