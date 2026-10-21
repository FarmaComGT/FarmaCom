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
});
