import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../api/axios';
import ProductoDetalleModal from './ProductoDetalleModal.jsx';

vi.mock('../../../api/axios', () => ({ default: { get: vi.fn() } }));
const mostrar = (props = {}) => render(<MemoryRouter><ProductoDetalleModal idProducto="7" destinoLotes="/inventario/productos/7/lotes" onClose={vi.fn()} {...props} /></MemoryRouter>);

describe('consulta del producto', () => {
  beforeEach(() => vi.resetAllMocks());
  it('carga la ficha sin edición, conserva ceros y ofrece ver lotes', async () => {
    api.get.mockResolvedValue({ data: { nombre_comercial: 'Oxímetro', stock_minimo: 0, activo: true, meses_alerta_vencimiento: 6 } });
    mostrar();
    expect(await screen.findByText('Oxímetro')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/productos/7');
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver lotes' })).toHaveAttribute('href', '/inventario/productos/7/lotes');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Nombre comercial').tagName).toBe('STRONG');
    expect(screen.getByText('Activo').className).toContain('badgeActive');
    expect(screen.queryByText('Mayoreo')).not.toBeInTheDocument();
  });
  it('permite reintentar una carga fallida y cerrar con Escape', async () => {
    api.get.mockRejectedValueOnce(new Error('Error de red')).mockResolvedValueOnce({ data: { nombre_comercial: 'Recuperado' } });
    const onClose = vi.fn();
    const usuario = userEvent.setup();
    mostrar({ onClose });
    await screen.findByRole('alert');
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Recuperado')).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('descarta la respuesta anterior si cambia el producto durante la carga', async () => {
    let resolverAnterior;
    api.get.mockImplementationOnce(() => new Promise((resolve) => { resolverAnterior = resolve; }))
      .mockResolvedValueOnce({ data: { nombre_comercial: 'Nuevo producto' } });
    const { rerender } = mostrar();
    rerender(<MemoryRouter><ProductoDetalleModal idProducto="8" destinoLotes="/inventario/productos/8/lotes" onClose={vi.fn()} /></MemoryRouter>);
    await screen.findByText('Nuevo producto');
    resolverAnterior({ data: { nombre_comercial: 'Respuesta anterior' } });
    await waitFor(() => expect(screen.queryByText('Respuesta anterior')).not.toBeInTheDocument());
  });
});
