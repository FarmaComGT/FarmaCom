import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutocompletadoProductosPOS from './AutocompletadoProductosPOS';

const producto = {
  carritoKey: 'lote-1',
  id_producto: 1,
  id_lote: 1,
  codigo: 'MED-001',
  nombre_comercial: 'Paracetamol',
  nombre_generico: 'Acetaminofén',
  presentacion: 'Blíster',
  numero_lote: 'L-001',
  fecha_vencimiento: '2027-01-01',
  stock_disponible: 5,
  precio_venta: 8.5,
  tiene_precio: true,
  estado_stock: 'normal',
  estado_vencimiento: 'normal',
};

function Escenario({
  productos = [],
  cargando = false,
  error = null,
  onAgregar = vi.fn(),
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
      onAgregar={onAgregar}
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

    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('1 resultado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(buscador).toHaveValue('');
    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
  });

  it('busca inmediatamente y agrega el primer resultado al presionar Enter', async () => {
    const user = userEvent.setup();
    const onAgregar = vi.fn();
    const onBuscarAhora = vi.fn(async () => [producto]);
    render(
      <Escenario
        onAgregar={onAgregar}
        onBuscarAhora={onBuscarAhora}
      />,
    );

    const buscador = screen.getByLabelText('Buscar productos');
    await user.type(buscador, 'MED-001{Enter}');

    await waitFor(() => expect(onAgregar).toHaveBeenCalledWith(producto));
    expect(onBuscarAhora).toHaveBeenCalledWith('MED-001');
    expect(buscador).toHaveValue('');
  });

  it('presenta un estado vacío después de una búsqueda sin resultados', async () => {
    const user = userEvent.setup();
    render(<Escenario />);

    await user.type(screen.getByLabelText('Buscar productos'), 'inexistente');

    expect(screen.getByText('Sin coincidencias disponibles')).toBeInTheDocument();
  });

  it('identifica visualmente una coincidencia aproximada', async () => {
    const user = userEvent.setup();
    render(<Escenario productos={[{ ...producto, tipo_coincidencia: 'aproximada' }]} />);

    await user.type(screen.getByLabelText('Buscar productos'), 'paracetamlo');

    expect(screen.getByText('Coincidencia aproximada')).toBeInTheDocument();
    expect(screen.getByText('Las coincidencias aproximadas aparecen después de las directas'))
      .toBeInTheDocument();
  });
});
