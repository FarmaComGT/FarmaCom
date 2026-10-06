import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LoteDeleteModal from './LoteDeleteModal';
import LoteFormModal from './LoteFormModal';

const lote = {
  id_lote: 7,
  id_producto: 2,
  id_proveedor: 3,
  id_sucursal: 4,
  numero_lote: 'LT-001',
  fecha_vencimiento: '2099-12-31',
  cantidad_ingresada: 20,
  stock_actual: 12,
  precio_compra: 10,
  margen_ganancia: 25,
  precio_venta: 12.5,
  precio_mayoreo: 10,
  cantidad_mayoreo: 5,
};

const catalogos = {
  productos: [{
    id_producto: 2,
    activo: true,
    nombre_comercial: 'Producto prueba',
    codigo: 'P-01',
    precio_compra: 10,
    presentacion: 'unidad',
  }],
  proveedores: [{ id_proveedor: 3, nombre: 'Proveedor prueba' }],
  sucursales: [{ id_sucursal: 4, nombre_sucursal: 'Sucursal prueba' }],
};

describe('modales de lote', () => {
  it('precarga el lote y entrega los datos editados', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <LoteFormModal
        isOpen
        {...catalogos}
        lote={lote}
        cargandoDatos={false}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Editar lote' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('LT-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      id_producto: 2,
      numero_lote: 'LT-001',
      stock_actual: 12,
      precio_compra: 10,
      limpiar_mayoreo: false,
    }));
  });

  it('permite cambiar y enviar el precio de compra del lote', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <LoteFormModal
        isOpen
        {...catalogos}
        lote={lote}
        cargandoDatos={false}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );

    const precioCompra = screen.getByLabelText('Precio compra *');
    await user.clear(precioCompra);
    await user.type(precioCompra, '11.50');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      precio_compra: 11.5,
      precio_venta: 12.5,
    }));
  });

  it('solicita confirmación antes de eliminar', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <LoteDeleteModal
        isOpen
        lote={lote}
        eliminando={false}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('LT-001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
