import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutocompletadoProductosPOS from './AutocompletadoProductosPOS';

const producto = {
  id_producto: 1,
  codigo: 'MED-001',
  nombre_comercial: 'Paracetamol',
  nombre_generico: 'Acetaminofén',
  presentacion: 'Blíster',
  stock_disponible: 5,
  precio_minimo: 8.5,
  precio_maximo: 8.5,
  tiene_precio: true,
  estado_stock: 'normal',
  estado_vencimiento: 'normal',
  cantidad_lotes: 1,
  lotes: [{
    id_lote: 1,
    numero_lote: 'L-001',
    fecha_vencimiento: '2027-01-01',
    stock_disponible: 5,
    precio_venta: 8.5,
    tiene_precio: true,
  }],
};

function Escenario({
  productos = [],
  cargando = false,
  error = null,
  onSeleccionar = vi.fn(),
  onBuscarAhora = vi.fn(async () => productos),
}) {
  const [busqueda, setBusqueda] = useState('');

  return (
    <AutocompletadoProductosPOS
      busqueda={busqueda}
      onBusquedaChange={setBusqueda}
      productos={productos}
      cargando={cargando}
      error={error}
      onSeleccionar={onSeleccionar}
      onBuscarAhora={onBuscarAhora}
      onRefrescar={() => {}}
    />
  );
}

describe('AutocompletadoProductosPOS', () => {
  it('orienta al usuario antes de comenzar la búsqueda', () => {
    render(<Escenario />);

    expect(screen.getByText('Encuentra un producto')).toBeInTheDocument();
    expect(screen.getByText('Buscar productos')).toBeInTheDocument();
  });

  it('muestra las coincidencias y permite limpiar la búsqueda', async () => {
    const user = userEvent.setup();
    render(<Escenario productos={[producto]} />);

    const buscador = screen.getByLabelText('Buscar productos');
    await user.type(buscador, 'para');

    expect(screen.getByRole('button', { name: 'Seleccionar lote de Paracetamol' }))
      .toBeInTheDocument();
    expect(screen.getByText('1 resultado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(buscador).toHaveValue('');
    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
  });

  it('busca inmediatamente y abre los lotes del primer resultado al presionar Enter', async () => {
    const user = userEvent.setup();
    const onSeleccionar = vi.fn();
    const onBuscarAhora = vi.fn(async () => [producto]);
    render(
      <Escenario
        onSeleccionar={onSeleccionar}
        onBuscarAhora={onBuscarAhora}
      />,
    );

    const buscador = screen.getByLabelText('Buscar productos');
    await user.type(buscador, 'MED-001{Enter}');

    await waitFor(() => expect(onSeleccionar).toHaveBeenCalledWith(producto));
    expect(onBuscarAhora).toHaveBeenCalledWith('MED-001');
    expect(buscador).toHaveValue('MED-001');
  });

  it('presenta un estado vacío después de una búsqueda sin resultados', async () => {
    const user = userEvent.setup();
    render(<Escenario />);

    await user.type(screen.getByLabelText('Buscar productos'), 'inexistente');

    expect(screen.getByText('Sin coincidencias disponibles')).toBeInTheDocument();
    expect(screen.getByText('¿Quiso decir…?')).toBeInTheDocument();
    expect(screen.getByText(
      'Prueba con el nombre genérico, una presentación o menos caracteres.',
    )).toBeInTheDocument();
  });

  it('sugiere el mejor nombre cuando solo existen coincidencias aproximadas', async () => {
    const user = userEvent.setup();
    render(<Escenario productos={[{ ...producto, tipo_coincidencia: 'aproximada' }]} />);

    await user.type(screen.getByLabelText('Buscar productos'), 'paracetamlo');

    expect(screen.getByText('Coincidencia aproximada')).toBeInTheDocument();
    expect(screen.getByText('¿Quiso decir…?')).toBeInTheDocument();
    expect(screen.getByText('Mostrando las opciones más cercanas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buscar Paracetamol' }));
    expect(screen.getByLabelText('Buscar productos')).toHaveValue('Paracetamol');
  });

  it('no muestra la sugerencia cuando existe una coincidencia directa', async () => {
    const user = userEvent.setup();
    render(<Escenario productos={[
      { ...producto, tipo_coincidencia: 'exacta' },
      {
        ...producto,
        id_producto: 2,
        nombre_comercial: 'Paracetamol Forte',
        tipo_coincidencia: 'aproximada',
      },
    ]} />);

    await user.type(screen.getByLabelText('Buscar productos'), 'paracetamol');

    expect(screen.queryByText('¿Quiso decir…?')).not.toBeInTheDocument();
    expect(screen.getByText('Las coincidencias aproximadas aparecen después de las directas'))
      .toBeInTheDocument();
  });

  it('resalta la parte coincidente aunque la búsqueda tenga una transposición', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Escenario productos={[{ ...producto, tipo_coincidencia: 'aproximada' }]} />,
    );

    await user.type(screen.getByLabelText('Buscar productos'), 'paracetamlo');

    expect(container.querySelector('mark')).toHaveTextContent('Paracetam');
  });

  it('selecciona el producto agrupado para consultar todos sus lotes', async () => {
    const user = userEvent.setup();
    const onSeleccionar = vi.fn();
    const productoAgrupado = {
      ...producto,
      cantidad_lotes: 2,
      stock_disponible: 8,
      lotes: [
        ...producto.lotes,
        {
          id_lote: 2,
          numero_lote: 'L-002',
          fecha_vencimiento: '2027-06-01',
          stock_disponible: 3,
          precio_venta: 8.5,
          tiene_precio: true,
        },
      ],
    };
    render(<Escenario productos={[productoAgrupado]} onSeleccionar={onSeleccionar} />);

    await user.type(screen.getByLabelText('Buscar productos'), 'para');
    await user.click(screen.getByRole('button', { name: 'Seleccionar lote de Paracetamol' }));

    expect(screen.getByText('2 lotes disponibles')).toBeInTheDocument();
    expect(onSeleccionar).toHaveBeenCalledWith(productoAgrupado);
    expect(onSeleccionar.mock.calls[0][0]).toMatchObject({
      id_producto: 1,
      stock_disponible: 8,
      cantidad_lotes: 2,
    });
  });
});
