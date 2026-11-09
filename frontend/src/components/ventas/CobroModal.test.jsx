import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CobroModal from './CobroModal.jsx';

const producto = (cambios = {}) => ({
  clave: 'lote-1',
  nombre_comercial: 'Paracetamol',
  cantidad: 2,
  precioUnitario: 8.5,
  ...cambios,
});

const callbacks = {
  onClose: vi.fn(),
  onCrearPagoPOS: vi.fn(),
  onConciliarPagoPOS: vi.fn(),
  onConfirm: vi.fn(),
};

const renderizar = (props = {}) => render(
  <CobroModal
    isOpen
    items={[producto()]}
    total={17}
    metodoPago="efectivo"
    clienteSeleccionado={null}
    pagoPOS={null}
    procesando={false}
    error={null}
    {...callbacks}
    {...props}
  />,
);

describe('CobroModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra un diálogo accesible y confirma el efectivo con punto o coma decimal', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByRole('dialog', { name: 'Cobro de venta' })).toBeInTheDocument();
    const monto = screen.getByLabelText('Monto recibido');
    expect(monto).toHaveFocus();
    await user.clear(monto);
    await user.type(monto, '20,50');
    await user.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    expect(callbacks.onConfirm).toHaveBeenCalledWith({ montoRecibido: 20.5 });
  });

  it('explica el monto insuficiente y evita confirmar hasta corregirlo', async () => {
    const user = userEvent.setup();
    renderizar();
    const monto = screen.getByLabelText('Monto recibido');

    await user.clear(monto);
    await user.type(monto, '10');

    expect(monto).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('El monto recibido no cubre el total de la venta.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar cobro' })).toBeDisabled();
  });

  it('envía el cobro de tarjeta y bloquea el cierre mientras el POS responde', async () => {
    const user = userEvent.setup();
    const { rerender } = renderizar({ metodoPago: 'tarjeta' });

    await user.click(screen.getByRole('button', { name: 'Cobrar con tarjeta' }));
    expect(callbacks.onCrearPagoPOS).toHaveBeenCalledOnce();

    rerender(
      <CobroModal
        isOpen
        items={[producto()]}
        total={17}
        metodoPago="tarjeta"
        pagoPOS={{ external_id: 'pos-1', estado: 'pendiente' }}
        {...callbacks}
      />,
    );

    expect(screen.getByText('Esperando confirmación del POS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar cobro' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('conserva la etiqueta original durante la carga y anuncia errores', () => {
    renderizar({ procesando: true, error: 'No se pudo registrar la venta.' });

    expect(screen.getByRole('button', { name: 'Confirmar cobro' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo registrar la venta.');
  });

  it('muestra las referencias y permite conciliar sin ofrecer otro cobro', async () => {
    const user = userEvent.setup();
    renderizar({
      metodoPago: 'tarjeta',
      pagoPOS: {
        external_id: 'farmacom-pos-1',
        estado: 'incidencia',
        referencia_pago: 'pay-123',
      },
    });

    expect(screen.getByText('Cobro confirmado; venta pendiente')).toBeInTheDocument();
    expect(screen.getByText('pay-123')).toBeInTheDocument();
    expect(screen.getByText('farmacom-pos-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Conciliar venta' }));

    expect(callbacks.onConciliarPagoPOS).toHaveBeenCalledOnce();
    expect(callbacks.onCrearPagoPOS).not.toHaveBeenCalled();
  });
});
