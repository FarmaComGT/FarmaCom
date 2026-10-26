import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductoFormModal from './ProductoFormModal';

const presentacionesIniciales = [
  { id_presentacion: 1, nombre: 'Caja', productos_asociados: 2 },
  { id_presentacion: 2, nombre: 'Blíster', productos_asociados: 0 },
];

const propsBase = {
  isOpen: true,
  modoEdicion: false,
  producto: null,
  codigoSugerido: 'MED004',
  categorias: [{ id_categoria: 1, nombre: 'Analgésico' }],
  casas: [{ id_casa: 1, nombre: 'Bayer', activo: true }],
  proveedores: [],
  presentaciones: presentacionesIniciales,
  cargandoDatos: false,
  guardando: false,
  errorFormulario: null,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  onCrearPresentacion: vi.fn(),
  onActualizarPresentacion: vi.fn(),
  onEliminarPresentacion: vi.fn(),
};

function ProductoFormModalConEstado(props) {
  const [presentaciones, setPresentaciones] = useState(presentacionesIniciales);

  const crearPresentacion = async (datos) => {
    const nueva = await props.onCrearPresentacion(datos);
    setPresentaciones((prev) => [...prev, nueva]);
    return nueva;
  };

  const actualizarPresentacion = async (id, datos) => {
    const actualizada = await props.onActualizarPresentacion(id, datos);
    setPresentaciones((prev) => prev.map(
      (p) => (p.id_presentacion === id ? { ...p, ...actualizada } : p),
    ));
    return actualizada;
  };

  const eliminarPresentacion = async (id) => {
    await props.onEliminarPresentacion(id);
    setPresentaciones((prev) => prev.filter((p) => p.id_presentacion !== id));
  };

  return (
    <ProductoFormModal
      {...propsBase}
      {...props}
      presentaciones={presentaciones}
      onCrearPresentacion={crearPresentacion}
      onActualizarPresentacion={actualizarPresentacion}
      onEliminarPresentacion={eliminarPresentacion}
    />
  );
}

describe('ProductoFormModal', () => {
  it('lista las presentaciones que vienen del catálogo dinámico, no una lista fija', () => {
    render(<ProductoFormModal {...propsBase} />);

    const select = screen.getByRole('combobox', { name: /Presentación/ });
    expect(within(select).getByText('Caja')).toBeInTheDocument();
    expect(within(select).getByText('Blíster')).toBeInTheDocument();
  });

  it('envía id_presentacion (no un string fijo) al guardar', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductoFormModal {...propsBase} onSubmit={onSubmit} />);

    const [selectPresentacion, selectCategoria, selectCasa] = screen.getAllByRole('combobox');
    await user.selectOptions(selectPresentacion, '2');
    await user.selectOptions(selectCategoria, '1');
    await user.selectOptions(selectCasa, '1');
    await user.type(screen.getByPlaceholderText('Ej. Aspirina Forte'), 'Ibuprofeno Forte');
    await user.type(screen.getByPlaceholderText('Ej. Ácido Acetilsalicílico'), 'Ibuprofeno');
    await user.type(screen.getByPlaceholderText('Ej. 500 mg'), '400 mg');
    await user.type(screen.getByPlaceholderText('0.00'), '10');
    await user.type(screen.getByPlaceholderText('Ej. 6'), '6');
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ id_presentacion: 2 }),
    );
  });

  it('permite guardar un producto sin concentración', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductoFormModal {...propsBase} onSubmit={onSubmit} />);

    const concentracion = screen.getByRole('textbox', { name: /Concentración/ });
    expect(concentracion).not.toBeRequired();

    const [selectPresentacion, selectCategoria, selectCasa] = screen.getAllByRole('combobox');
    await user.selectOptions(selectPresentacion, '1');
    await user.selectOptions(selectCategoria, '1');
    await user.selectOptions(selectCasa, '1');
    await user.type(screen.getByPlaceholderText('Ej. Aspirina Forte'), 'Alcohol en gel');
    await user.type(screen.getByPlaceholderText('Ej. Ácido Acetilsalicílico'), 'Alcohol');
    await user.type(screen.getByPlaceholderText('0.00'), '15');
    await user.type(screen.getByPlaceholderText('Ej. 6'), '6');
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ concentracion: null }),
    );
  });

  it('permite crear una presentación nueva desde un modal, sin salir del formulario', async () => {
    const user = userEvent.setup();
    const onCrearPresentacion = vi.fn().mockResolvedValue({ id_presentacion: 3, nombre: 'Frasco' });
    render(<ProductoFormModalConEstado onCrearPresentacion={onCrearPresentacion} />);

    await user.click(screen.getByRole('button', { name: /Nueva presentación/ }));
    expect(screen.getByRole('heading', { name: 'Nueva presentación' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Ej. Frasco, Sobre, Ampolla...'), 'Frasco');
    await user.click(screen.getByRole('button', { name: 'Crear presentación' }));

    expect(onCrearPresentacion).toHaveBeenCalledWith({ nombre: 'Frasco' });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Nueva presentación' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('combobox', { name: /Presentación/ })).toHaveValue('3');
  });

  it('permite editar la presentación seleccionada', async () => {
    const user = userEvent.setup();
    const onActualizarPresentacion = vi.fn().mockResolvedValue({
      id_presentacion: 2,
      nombre: 'Paquete',
    });
    render(
      <ProductoFormModalConEstado onActualizarPresentacion={onActualizarPresentacion} />,
    );

    const select = screen.getByRole('combobox', { name: /Presentación/ });
    await user.selectOptions(select, '2');
    await user.click(screen.getByRole('button', { name: 'Editar presentación seleccionada' }));

    expect(screen.getByRole('heading', { name: 'Editar presentación' })).toBeInTheDocument();
    const nombre = screen.getByPlaceholderText('Ej. Frasco, Sobre, Ampolla...');
    await user.clear(nombre);
    await user.type(nombre, 'Paquete');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onActualizarPresentacion).toHaveBeenCalledWith(2, { nombre: 'Paquete' });
    await waitFor(() => expect(within(select).getByText('Paquete')).toBeInTheDocument());
    expect(select).toHaveValue('2');
  });

  it('solicita confirmación y elimina una presentación sin productos asociados', async () => {
    const user = userEvent.setup();
    const onEliminarPresentacion = vi.fn().mockResolvedValue(undefined);
    render(<ProductoFormModalConEstado onEliminarPresentacion={onEliminarPresentacion} />);

    const select = screen.getByRole('combobox', { name: /Presentación/ });
    await user.selectOptions(select, '2');
    await user.click(screen.getByRole('button', { name: 'Eliminar presentación seleccionada' }));

    expect(screen.getByRole('heading', { name: 'Confirmar eliminación' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    expect(onEliminarPresentacion).toHaveBeenCalledWith(2);
    await waitFor(() => expect(within(select).queryByText('Blíster')).not.toBeInTheDocument());
    expect(select).toHaveValue('');
  });

  it('explica al intentar eliminar una presentación asociada a productos', async () => {
    const user = userEvent.setup();
    render(<ProductoFormModal {...propsBase} />);

    await user.selectOptions(screen.getByRole('combobox', { name: /Presentación/ }), '1');
    const botonEliminar = screen.getByRole('button', {
      name: 'Eliminar presentación seleccionada',
    });

    expect(screen.queryByText(/se usa en 2 productos/)).not.toBeInTheDocument();
    await user.click(botonEliminar);

    expect(screen.getByText(/se usa en 2 productos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sí, eliminar' })).not.toBeInTheDocument();
  });
});

describe('regresión del formulario de producto dividido en secciones', () => {
  const producto = {
    id_producto: 9, codigo: 'MED009-CA', nombre_comercial: 'Aspirina',
    nombre_generico: 'Ácido acetilsalicílico', concentracion: '500 mg',
    id_presentacion: 1, id_categoria: 1, id_casa: 1, id_proveedor: 3,
    precio_compra: 10, stock_minimo: 0, meses_alerta_vencimiento: 6,
    aplica_mayoreo: true, activo: false,
  };
  const proveedores = [{ id_proveedor: 3, nombre: 'Distribuidora', activo: true }];
  // Algunas etiquetas de las secciones no están asociadas al input.
  const campo = (nombre) => screen.getByRole('dialog').querySelector(`[name="${nombre}"]`);

  it('envía un único payload normalizado con los valores de todas las secciones', async () => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductoFormModal {...propsBase} proveedores={proveedores} onSubmit={onSubmit} />);

    await usuario.type(campo('nombre_comercial'), ' Aspirina Forte ');
    await usuario.type(campo('nombre_generico'), ' Ácido acetilsalicílico ');
    await usuario.type(campo('concentracion'), ' 500 mg ');
    await usuario.selectOptions(campo('id_presentacion'), '1');
    await usuario.selectOptions(campo('id_categoria'), '1');
    await usuario.selectOptions(campo('id_casa'), '1');
    await usuario.selectOptions(campo('id_proveedor'), '3');
    await usuario.type(campo('precio_compra'), '12.50');
    await usuario.type(campo('stock_minimo'), '0');
    await usuario.type(campo('meses_alerta_vencimiento'), '6');
    await usuario.click(screen.getByRole('checkbox', { name: /Aplica para mayoreo/ }));
    expect(screen.getByDisplayValue('MED004-CA')).toBeDisabled();

    await usuario.click(screen.getByRole('button', { name: 'Guardar producto' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      codigo: 'MED004-CA', nombre_comercial: 'Aspirina Forte', nombre_generico: 'Ácido acetilsalicílico',
      concentracion: '500 mg', id_presentacion: 1, id_categoria: 1, id_casa: 1,
      id_proveedor: 3, precio_compra: 12.5, stock_minimo: 0,
      meses_alerta_vencimiento: 6, aplica_mayoreo: true,
    });
  });

  it('precarga la edición, conserva el código y permite limpiar campos opcionales', async () => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductoFormModal {...propsBase} modoEdicion producto={producto} proveedores={proveedores} onSubmit={onSubmit} />);

    expect(screen.getByRole('dialog', { name: 'Editar producto' })).toBeInTheDocument();
    expect(campo('nombre_comercial')).toHaveValue('Aspirina');
    expect(campo('id_proveedor')).toHaveValue('3');
    expect(campo('stock_minimo')).toHaveValue(0);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(campo('aplica_mayoreo')).toBeChecked();

    await usuario.selectOptions(campo('id_presentacion'), '2');
    await usuario.selectOptions(campo('id_proveedor'), '');
    await usuario.clear(campo('concentracion'));
    await usuario.click(campo('aplica_mayoreo'));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByDisplayValue('MED009-CA')).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      codigo: 'MED009-CA', nombre_comercial: 'Aspirina', nombre_generico: 'Ácido acetilsalicílico',
      concentracion: null, id_presentacion: 2, id_categoria: 1, id_casa: 1,
      id_proveedor: undefined, precio_compra: 10, stock_minimo: 0,
      meses_alerta_vencimiento: 6, aplica_mayoreo: false,
    });
  });

  it('rechaza un nombre en blanco y limpia el error al corregirlo sin perder el resto', async () => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductoFormModal {...propsBase} modoEdicion producto={producto} proveedores={proveedores} onSubmit={onSubmit} />);

    await usuario.clear(campo('nombre_comercial'));
    await usuario.type(campo('nombre_comercial'), ' ');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('El nombre comercial es requerido.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await usuario.type(campo('nombre_comercial'), 'Corregido');

    expect(screen.queryByText('El nombre comercial es requerido.')).not.toBeInTheDocument();
    expect(campo('precio_compra')).toHaveValue(10);
    expect(campo('id_presentacion')).toHaveValue('1');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ nombre_comercial: 'Corregido' }));
  });

  it('presenta el error del servidor y conserva los datos editados para reintentar', async () => {
    const usuario = userEvent.setup();
    const props = { ...propsBase, modoEdicion: true, producto, proveedores, onSubmit: vi.fn() };
    const { rerender } = render(<ProductoFormModal {...props} />);
    await usuario.clear(campo('nombre_comercial'));
    await usuario.type(campo('nombre_comercial'), 'Nombre editado');

    rerender(<ProductoFormModal {...props} errorFormulario="Ya existe ese producto" />);

    expect(screen.getByText('Ya existe ese producto')).toBeInTheDocument();
    expect(campo('nombre_comercial')).toHaveValue('Nombre editado');
    expect(campo('precio_compra')).toHaveValue(10);
  });

  it('reinicia valores y errores al cerrar una edición y abrir un producto nuevo', async () => {
    const usuario = userEvent.setup();
    const props = { ...propsBase, modoEdicion: true, producto, proveedores, onSubmit: vi.fn() };
    const { rerender } = render(<ProductoFormModal {...props} />);
    await usuario.clear(campo('nombre_comercial'));
    await usuario.type(campo('nombre_comercial'), ' ');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('El nombre comercial es requerido.')).toBeInTheDocument();

    rerender(<ProductoFormModal {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<ProductoFormModal {...props} modoEdicion={false} producto={null} codigoSugerido="MED010" />);

    expect(screen.getByRole('dialog', { name: 'Nuevo producto' })).toBeInTheDocument();
    expect(campo('nombre_comercial')).toHaveValue('');
    expect(campo('id_presentacion')).toHaveValue('');
    expect(campo('id_proveedor')).toHaveValue('');
    expect(campo('precio_compra')).toHaveValue(null);
    expect(campo('aplica_mayoreo')).not.toBeChecked();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByDisplayValue('MED010')).toBeInTheDocument();
    expect(screen.queryByText('El nombre comercial es requerido.')).not.toBeInTheDocument();
  });

  it.each([
    { estado: 'cargando catálogos', cargandoDatos: true, guardando: false, nombre: 'Guardar producto' },
    { estado: 'guardando', cargandoDatos: false, guardando: true, nombre: 'Guardando...' },
  ])('bloquea el envío mientras está $estado', async ({ cargandoDatos, guardando, nombre }) => {
    const usuario = userEvent.setup();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<ProductoFormModal {...propsBase} cargandoDatos={cargandoDatos} guardando={guardando} onSubmit={onSubmit} onClose={onClose} />);

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
      expect(campo('id_categoria')).toBeDisabled();
      expect(campo('id_casa')).toBeDisabled();
      expect(campo('id_presentacion')).toBeDisabled();
    }
  });

  it('conserva las dos acciones de cierre sin enviar el formulario', async () => {
    const usuario = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<ProductoFormModal {...propsBase} onClose={onClose} onSubmit={onSubmit} />);

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
