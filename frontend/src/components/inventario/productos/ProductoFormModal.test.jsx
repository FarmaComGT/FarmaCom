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
