import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClienteSelectorPOS from './ClienteSelectorPOS';

const clientes = [
  { id_cliente: 1, nombre_cliente: 'Ana López', nit: '1234567-K' },
  { id_cliente: 2, nombre_cliente: 'Ana López', nit: '9876543-2' },
  { id_cliente: 3, nombre_cliente: 'Pedro Pérez', nit: null },
];

async function abrir() {
  const user = userEvent.setup();
  const onSeleccionar = vi.fn();
  render(<ClienteSelectorPOS clientes={clientes} cargando={false} clienteSeleccionado={null} onSeleccionar={onSeleccionar} />);
  await user.click(screen.getByRole('button', { name: 'Consumidor final' }));
  return { user, onSeleccionar, input: screen.getByRole('searchbox', { name: 'Buscar cliente por nombre o NIT' }) };
}

describe('ClienteSelectorPOS', () => {
  it('no lista clientes al abrir, escribir o enviar una búsqueda vacía', async () => {
    const { user, input } = await abrir();
    expect(screen.queryByText('Ana López')).not.toBeInTheDocument();
    await user.type(input, '   {Enter}');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'Ana');
    expect(screen.queryByText('Ana López')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getAllByText('Ana López')).toHaveLength(2);
    await user.type(input, 'x');
    expect(screen.queryByText('Ana López')).not.toBeInTheDocument();
  });

  it.each(['1234567-k', '1234567k', ' 1234567 K '])('identifica al cliente por NIT con la búsqueda %s', async (busqueda) => {
    const { user, input, onSeleccionar } = await abrir();
    await user.type(input, `${busqueda}{Enter}`);
    expect(screen.queryByText('NIT 9876543-2')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ana López NIT 1234567-K' }));
    expect(onSeleccionar).toHaveBeenCalledWith(clientes[0]);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('conserva la búsqueda por nombre y clientes sin NIT', async () => {
    const { user, input, onSeleccionar } = await abrir();
    await user.type(input, ' pedro {Enter}');
    await user.click(screen.getByRole('button', { name: 'Pedro Pérez Sin NIT' }));
    expect(onSeleccionar).toHaveBeenCalledWith(clientes[2]);
  });

  it('permite vender a consumidor final incluso sin coincidencias', async () => {
    const { user, input, onSeleccionar } = await abrir();
    await user.type(input, 'inexistente{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('No se encontraron clientes');
    await user.keyboard('{Escape}');
    expect(onSeleccionar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Consumidor final' })).toHaveFocus();
  });
});
