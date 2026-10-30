import React from 'react';
import { render as renderBase, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import InventarioProductosTable from './InventarioProductosTable.jsx';

const render = (ui) => renderBase(<MemoryRouter>{ui}</MemoryRouter>);

const producto = {
  id_producto: 1,
  codigo: 'MED001-TAB',
  nombre_comercial: 'Paracetamol',
  nombre_generico: 'Acetaminofén',
  presentacion: 'Tableta',
  concentracion: '500 mg',
  categoria_nombre: 'Analgésicos',
  casa_nombre: 'Casa A',
  stock_total: 20,
  stock_minimo: 5,
  total_lotes: 2,
  estado_stock: 'normal',
  estado_vencimiento: 'normal',
  activo: true,
};

describe('InventarioProductosTable', () => {
  let props;

  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    props = {
      productos: [producto],
      cargando: false,
      puedeVerHistorial: true,
      cambiandoEstadoId: null,
      onEditar: vi.fn(),
      onCambiarEstado: vi.fn(),
      onVerHistorial: vi.fn(),
      onVerLotes: vi.fn(),
    };
  });

  it('muestra la información del producto y envía el producto a cada acción', async () => {
    const usuario = userEvent.setup();
    render(<InventarioProductosTable {...props} />);

    expect(screen.getByText('MED001-TAB')).toBeInTheDocument();
    expect(screen.getByText('Acetaminofén · 500 mg')).toBeInTheDocument();
    expect(screen.getByText('Tableta')).toBeInTheDocument();
    expect(screen.getByText('Analgésicos')).toBeInTheDocument();
    expect(screen.getByText('Casa A')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Mín. 5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await usuario.click(screen.getByLabelText('Acciones de Paracetamol'));
    await usuario.click(screen.getByRole('button', { name: 'Editar Paracetamol' }));
    expect(props.onEditar).toHaveBeenCalledExactlyOnceWith(producto);

    await usuario.click(screen.getByLabelText('Acciones de Paracetamol'));
    await usuario.click(screen.getByRole('button', { name: 'Desactivar Paracetamol' }));
    expect(props.onCambiarEstado).toHaveBeenCalledExactlyOnceWith(producto);

    await usuario.click(screen.getByLabelText('Acciones de Paracetamol'));
    await usuario.click(screen.getByRole('button', { name: 'Ver historial de precios de Paracetamol' }));
    expect(props.onVerHistorial).toHaveBeenCalledExactlyOnceWith(producto);

    expect(screen.getByRole('link', { name: 'Ver lotes de Paracetamol' })).toHaveAttribute('href', '/inventario/productos/1/lotes');
  });

  it('muestra el estado de carga sin presentar resultados ni acciones', () => {
    render(<InventarioProductosTable {...props} cargando />);

    expect(screen.getByText('Cargando inventario…')).toBeInTheDocument();
    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('No hay productos que coincidan con los filtros.')).not.toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay productos', () => {
    render(<InventarioProductosTable {...props} productos={[]} />);

    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('presenta los valores alternativos para un producto sin datos opcionales', () => {
    render(<InventarioProductosTable {...props} productos={[{
      id_producto: 2,
      nombre_comercial: 'Producto incompleto',
      activo: false,
    }]} puedeVerHistorial={false} />);

    expect(screen.getByText('Sin nombre genérico')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.getByText('Mín. 0')).toBeInTheDocument();
    expect(screen.queryByText('Tableta')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver historial de precios/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar Producto incompleto', hidden: true })).toBeEnabled();
  });

  it('bloquea solo el cambio de estado del producto que se está actualizando', async () => {
    const usuario = userEvent.setup();
    const inactivo = { ...producto, id_producto: 2, nombre_comercial: 'Loratadina', activo: false };
    render(<InventarioProductosTable {...props} productos={[producto, inactivo]} cambiandoEstadoId={1} />);

    await usuario.click(screen.getByLabelText('Acciones de Paracetamol'));
    const desactivar = screen.getByRole('button', { name: 'Desactivar Paracetamol' });
    expect(desactivar).toBeDisabled();
    await usuario.click(desactivar);
    expect(props.onCambiarEstado).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Editar Paracetamol' })).toBeEnabled();

    await usuario.click(screen.getByLabelText('Acciones de Loratadina'));
    await usuario.click(screen.getByRole('button', { name: 'Activar Loratadina' }));
    expect(props.onCambiarEstado).toHaveBeenCalledExactlyOnceWith(inactivo);
  });
});
