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

  it('fija y precarga el producto al registrar desde su detalle', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <LoteFormModal
        isOpen
        {...catalogos}
        productoInicialId={2}
        bloquearProducto
        sucursalInicialId={4}
        lote={null}
        cargandoDatos={false}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('combobox', { name: /Producto/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /Producto/ })).toHaveValue('2');
    expect(screen.getByLabelText('Precio compra *')).toHaveValue(10);

    await user.type(screen.getByRole('textbox', { name: /Número de lote/ }), 'LT-NUEVO');
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

describe('regresión del formulario de lote dividido en secciones', () => {
  const catalogosRegresion = {
    ...catalogos,
    productos: [
      ...catalogos.productos,
      { id_producto: 5, activo: true, nombre_comercial: 'Otro producto', codigo: 'P-05', precio_compra: 5, presentacion: 'Tableta' },
    ],
    proveedores: [{ id_proveedor: 3, nombre: 'Proveedor prueba', activo: true }],
  };
  const propsBase = {
    ...catalogosRegresion, isOpen: true, lote: null,
    productoInicialId: 2, sucursalInicialId: 4, cargandoDatos: false,
  };
  // Se consultan por nombre los campos cuyas etiquetas no están asociadas.
  const campo = (nombre) => screen.getByRole('dialog').querySelector(`[name="${nombre}"]`);
  const campoPrecio = (etiqueta) => screen.getByText(etiqueta, { selector: 'label' }).parentElement.querySelector('input');

  it('crea un lote con datos y precios de ambas secciones en un único payload', async () => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoteFormModal {...propsBase} onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(screen.getByRole('dialog', { name: 'Ingresar lote' })).toBeInTheDocument();
    expect(screen.getByLabelText('Precio compra *')).toHaveValue(10);
    await usuario.selectOptions(campo('id_proveedor'), '3');
    await usuario.type(screen.getByRole('textbox', { name: /Número de lote/ }), ' LT-NUEVO ');
    await usuario.type(campo('fecha_vencimiento'), '2099-12-31');
    await usuario.type(campo('cantidad_ingresada'), '20');
    await usuario.type(campoPrecio(/Margen %/), '25');
    expect(campoPrecio(/Precio venta/)).toHaveValue(12.5);
    await usuario.type(campoPrecio('Precio mayoreo'), '11');
    await usuario.type(campoPrecio('Cantidad mayoreo'), '5');

    await usuario.click(screen.getByRole('button', { name: 'Guardar lote' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      id_producto: 2, id_proveedor: 3, id_sucursal: 4, numero_lote: 'LT-NUEVO',
      fecha_vencimiento: '2099-12-31', cantidad_ingresada: 20,
      precio_compra: 10, precio_venta: 12.5, margen_ganancia: 25,
      precio_mayoreo: 11, cantidad_mayoreo: 5,
    });
  });

  it('no envía un mayoreo incompleto y permite quitarlo explícitamente en edición', async () => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoteFormModal {...propsBase} lote={lote} onClose={vi.fn()} onSubmit={onSubmit} />);

    await usuario.clear(campoPrecio('Cantidad mayoreo'));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('Completa precio y cantidad de mayoreo, o deja ambos vacíos.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(campo('stock_actual')).toHaveValue(12);

    await usuario.clear(campoPrecio('Precio mayoreo'));
    expect(screen.queryByText('Completa precio y cantidad de mayoreo, o deja ambos vacíos.')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      id_producto: 2, id_proveedor: 3, id_sucursal: 4, numero_lote: 'LT-001',
      fecha_vencimiento: '2099-12-31', cantidad_ingresada: 20, stock_actual: 12,
      precio_compra: 10, precio_venta: 12.5, margen_ganancia: 25,
      precio_mayoreo: null, cantidad_mayoreo: null, limpiar_mayoreo: true,
    });
  });

  it('bloquea el stock superior al ingreso y permite corregirlo a cero', async () => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoteFormModal {...propsBase} lote={lote} onClose={vi.fn()} onSubmit={onSubmit} />);

    await usuario.clear(campo('stock_actual'));
    await usuario.type(campo('stock_actual'), '21');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('El stock actual no puede superar la cantidad ingresada.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await usuario.clear(campo('stock_actual'));
    await usuario.type(campo('stock_actual'), '0');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ stock_actual: 0, cantidad_ingresada: 20 }));
  });

  it('recalcula el margen al cambiar el producto y conserva los datos del lote', async () => {
    const usuario = userEvent.setup();
    render(<LoteFormModal {...propsBase} onClose={vi.fn()} onSubmit={vi.fn()} />);
    await usuario.type(screen.getByRole('textbox', { name: /Número de lote/ }), 'LT-CONSERVADO');
    await usuario.type(campoPrecio(/Precio venta/), '20');
    expect(campoPrecio(/Margen %/)).toHaveValue(100);

    await usuario.selectOptions(screen.getByRole('combobox', { name: /Producto/ }), '5');

    expect(screen.getByLabelText('Precio compra *')).toHaveValue(5);
    expect(campoPrecio(/Precio venta/)).toHaveValue(20);
    expect(campoPrecio(/Margen %/)).toHaveValue(300);
    expect(screen.getByDisplayValue('Tableta')).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /Número de lote/ })).toHaveValue('LT-CONSERVADO');
    expect(campo('id_sucursal')).toHaveValue('4');
  });

  it('mantiene los datos editados cuando el servidor devuelve un error', async () => {
    const usuario = userEvent.setup();
    const props = { ...propsBase, lote, onClose: vi.fn(), onSubmit: vi.fn() };
    const { rerender } = render(<LoteFormModal {...props} />);
    await usuario.clear(screen.getByRole('textbox', { name: /Número de lote/ }));
    await usuario.type(screen.getByRole('textbox', { name: /Número de lote/ }), 'LT-DUPLICADO');

    rerender(<LoteFormModal {...props} errorFormulario="Ya existe ese lote" />);

    expect(screen.getByText('Ya existe ese lote')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Número de lote/ })).toHaveValue('LT-DUPLICADO');
    expect(screen.getByLabelText('Precio compra *')).toHaveValue(10);
    expect(campo('stock_actual')).toHaveValue(12);
  });

  it('reinicia los campos y errores al cerrar una edición y abrir un lote nuevo', async () => {
    const usuario = userEvent.setup();
    const props = { ...propsBase, onClose: vi.fn(), onSubmit: vi.fn() };
    const { rerender } = render(<LoteFormModal {...props} lote={lote} />);
    await usuario.clear(campoPrecio('Cantidad mayoreo'));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('Completa precio y cantidad de mayoreo, o deja ambos vacíos.')).toBeInTheDocument();

    rerender(<LoteFormModal {...props} lote={lote} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<LoteFormModal {...props} />);

    expect(screen.getByRole('dialog', { name: 'Ingresar lote' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Número de lote/ })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: /Producto/ })).toHaveValue('2');
    expect(campo('id_sucursal')).toHaveValue('4');
    expect(campo('cantidad_ingresada')).toHaveValue(null);
    expect(screen.getByLabelText('Precio compra *')).toHaveValue(10);
    expect(campoPrecio('Precio mayoreo')).toHaveValue(null);
    expect(campoPrecio('Cantidad mayoreo')).toHaveValue(null);
    expect(campo('stock_actual')).not.toBeInTheDocument();
    expect(screen.queryByText('Completa precio y cantidad de mayoreo, o deja ambos vacíos.')).not.toBeInTheDocument();
  });

  it.each([
    { estado: 'cargando catálogos', cargandoDatos: true, guardando: false, nombre: 'Guardar lote' },
    { estado: 'guardando', cargandoDatos: false, guardando: true, nombre: 'Guardando...' },
  ])('bloquea el envío mientras está $estado', async ({ cargandoDatos, guardando, nombre }) => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<LoteFormModal {...propsBase} cargandoDatos={cargandoDatos} guardando={guardando} onSubmit={onSubmit} onClose={onClose} />);

    const guardar = screen.getByRole('button', { name: nombre });
    expect(guardar).toBeDisabled();
    await usuario.click(guardar);
    expect(onSubmit).not.toHaveBeenCalled();
    if (guardando) {
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
      await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));
      expect(onClose).not.toHaveBeenCalled();
    } else {
      expect(campo('id_producto')).toBeDisabled();
      expect(campo('id_proveedor')).toBeDisabled();
      expect(campo('id_sucursal')).toBeDisabled();
    }
  });

  it('conserva las acciones de cancelar y cerrar sin enviar el formulario', async () => {
    const usuario = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<LoteFormModal {...propsBase} onClose={onClose} onSubmit={onSubmit} />);

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
