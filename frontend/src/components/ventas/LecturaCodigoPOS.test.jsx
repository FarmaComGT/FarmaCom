import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LecturaCodigoPOS from './LecturaCodigoPOS';
import { buscarProductoPorLectura } from '../../api/lecturaProductos';

vi.mock('../../api/lecturaProductos', () => ({ buscarProductoPorLectura: vi.fn() }));

describe('LecturaCodigoPOS', () => {
  beforeEach(() => vi.resetAllMocks());

  it('un nombre con espacios o tildes actualiza sugerencias sin intentar decodificarlo como código', async () => {
    const seleccionar = vi.fn();
    const buscar = vi.fn(async () => [{ id_producto: 7 }]);
    render(<LecturaCodigoPOS contexto="1:a" onSeleccionar={seleccionar} onBuscarAhora={buscar} />);
    await userEvent.setup().type(screen.getByRole('textbox'), 'Ácido acetilsalicílico{Enter}');
    expect(buscar).toHaveBeenCalledWith('Ácido acetilsalicílico');
    expect(buscarProductoPorLectura).not.toHaveBeenCalled();
    expect(seleccionar).not.toHaveBeenCalled();
  });

  it('no convierte un conflicto del código exacto en una selección de otro producto', async () => {
    buscarProductoPorLectura.mockRejectedValue({ response: { status: 409, data: { mensaje: 'El producto está inactivo.' } } });
    const buscar = vi.fn();
    render(<LecturaCodigoPOS contexto="1:a" onSeleccionar={vi.fn()} onBuscarAhora={buscar} />);
    await userEvent.setup().type(screen.getByRole('textbox'), '000123{Enter}');
    expect(await screen.findByText('El producto está inactivo.')).toBeInTheDocument();
    expect(buscar).not.toHaveBeenCalled();
  });

  it('simula un lector USB mediante texto y Enter y abre los lotes del producto exacto', async () => {
    const producto = { id_producto: 7, lotes: [{ id_lote: 9 }] };
    buscarProductoPorLectura.mockResolvedValue(producto);
    const seleccionar = vi.fn();
    const usuario = userEvent.setup();
    render(<LecturaCodigoPOS contexto="1:a" onSeleccionar={seleccionar} />);
    const campo = screen.getByRole('textbox', { name: 'Buscar productos' });
    await usuario.type(campo, '0012345678905{Enter}');
    await waitFor(() => expect(seleccionar).toHaveBeenCalledWith(producto));
    expect(buscarProductoPorLectura).toHaveBeenCalledWith('0012345678905', { signal: expect.any(AbortSignal) });
    expect(campo).toHaveValue('');
  });

  it('muestra el error del servidor y permite reemplazar un código desconocido', async () => {
    buscarProductoPorLectura.mockRejectedValue({ response: { data: { mensaje: 'Código no registrado.' } } });
    const seleccionar = vi.fn();
    const usuario = userEvent.setup();
    render(<LecturaCodigoPOS contexto="1:a" onSeleccionar={seleccionar} />);
    const campo = screen.getByRole('textbox');
    await usuario.type(campo, 'NO-EXISTE{Enter}');
    expect(await screen.findByText('Código no registrado.')).toBeInTheDocument();
    expect(campo).toHaveFocus();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(seleccionar).not.toHaveBeenCalled();
  });

  it('no procesa dos Enter simultáneos y descarta respuestas tras cambiar de carrito', async () => {
    let resolver;
    buscarProductoPorLectura.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    const seleccionar = vi.fn();
    const usuario = userEvent.setup();
    const { rerender } = render(<LecturaCodigoPOS contexto="1:a" onSeleccionar={seleccionar} />);
    await usuario.type(screen.getByRole('textbox'), 'TEST-1{Enter}{Enter}');
    expect(buscarProductoPorLectura).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled();
    rerender(<LecturaCodigoPOS contexto="1:b" onSeleccionar={seleccionar} />);
    await act(async () => resolver({ id_producto: 7 }));
    expect(seleccionar).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('permite enviar el campo vacío para mostrar validación', async () => {
    const usuario = userEvent.setup();
    render(<LecturaCodigoPOS contexto="1:a" onSeleccionar={vi.fn()} />);
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByText(/Escribe o escanea un código/)).toBeInTheDocument();
    expect(buscarProductoPorLectura).not.toHaveBeenCalled();
  });
});
