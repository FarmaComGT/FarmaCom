import { ToastProvider } from '../../context/ToastContext.jsx';
import React from 'react';
import { render as renderBase, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import NuevoClienteModal from './NuevoClienteModal';

describe('NuevoClienteModal', () => {
  it('normaliza y envía el NIT desde el punto de venta', async () => {
    const user = userEvent.setup();
    const onCrear = vi.fn().mockResolvedValue({ id_cliente: 3 });

    render(
      <NuevoClienteModal isOpen onClose={() => {}} onCrear={onCrear} />,
    );

    await user.type(screen.getByLabelText('Nombre completo'), 'Ana López');
    await user.type(screen.getByLabelText(/NIT/), '1234567-k');
    await user.click(screen.getByRole('button', { name: 'Agregar y seleccionar' }));

    expect(onCrear).toHaveBeenCalledWith({
      nombre_cliente: 'Ana López',
      nit: '1234567-K',
      observaciones: null,
    });
  });

  it('permite registrar un cliente sin NIT', async () => {
    const user = userEvent.setup();
    const onCrear = vi.fn().mockResolvedValue({ id_cliente: 3 });

    render(
      <NuevoClienteModal isOpen onClose={() => {}} onCrear={onCrear} />,
    );

    await user.type(screen.getByLabelText('Nombre completo'), 'Ana López');
    await user.click(screen.getByRole('button', { name: 'Agregar y seleccionar' }));

    expect(onCrear).toHaveBeenCalledWith(expect.objectContaining({ nit: null }));
  });
});

const render = (ui, options) => renderBase(ui, { wrapper: ToastProvider, ...options });
