import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistorialPrecioProductoModal from './HistorialPrecioProductoModal';

const { mockUseHistorial } = vi.hoisted(() => ({ mockUseHistorial: vi.fn() }));

vi.mock('../../../hooks/useHistorialPreciosProducto', () => ({
  default: mockUseHistorial,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="grafica-precios">{children}</div>,
  BarChart: ({ children, data }) => (
    <div>
      {data.map((cambio) => (
        <span key={cambio.id_grafica} data-testid="dato-grafica">
          {cambio.etiqueta}:{cambio.valor_nuevo}:{cambio.tipo_precio}
        </span>
      ))}
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: ({ children }) => <div>{children}</div>,
  Cell: () => null,
}));

const producto = { id_producto: 4, nombre_comercial: 'Paracetamol', codigo: 'MED004-UN' };
const historial = [
  {
    id_historial_precio: 2,
    numero_lote: 'LOTE-B',
    tipo_precio: 'venta',
    valor_anterior: '15.00',
    valor_nuevo: '16.00',
    nombre_usuario: 'Administradora',
    fecha_cambio: '2026-03-10T10:00:00Z',
  },
  {
    id_historial_precio: 1,
    numero_lote: 'LOTE-A',
    tipo_precio: 'compra',
    valor_anterior: '9.00',
    valor_nuevo: '10.00',
    nombre_usuario: 'Dueño',
    fecha_cambio: '2026-01-10T10:00:00Z',
  },
];

describe('HistorialPrecioProductoModal', () => {
  beforeEach(() => {
    mockUseHistorial.mockReturnValue({
      historial,
      cargando: false,
      error: null,
      recargar: vi.fn(),
    });
  });

  it('presenta la gráfica y la tabla de cambios', () => {
    render(<HistorialPrecioProductoModal producto={producto} isOpen onClose={vi.fn()} />);

    expect(screen.getByTestId('grafica-precios')).toBeInTheDocument();
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('LOTE-A')).toBeInTheDocument();
    expect(within(tabla).getByText('LOTE-B')).toBeInTheDocument();
    expect(within(tabla).getByText('Q16.00')).toBeInTheDocument();
  });

  it('permite alternar la gráfica entre venta y compra sin mezclar los datos', () => {
    render(<HistorialPrecioProductoModal producto={producto} isOpen onClose={vi.fn()} />);

    const grafica = screen.getByTestId('grafica-precios');
    expect(screen.getByRole('button', { name: 'Venta' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(grafica).getByText('Inicial:15:venta')).toBeInTheDocument();
    expect(within(grafica).getByText('1:16:venta')).toBeInTheDocument();
    expect(within(grafica).queryByText('Inicial:9:compra')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Compra' }));

    expect(screen.getByRole('button', { name: 'Compra' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(grafica).getByText('Inicial:9:compra')).toBeInTheDocument();
    expect(within(grafica).getByText('1:10:compra')).toBeInTheDocument();
    expect(within(grafica).queryByText('Inicial:15:venta')).not.toBeInTheDocument();
  });

  it('filtra los cambios usando el rango de fechas', () => {
    render(<HistorialPrecioProductoModal producto={producto} isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-02-01' } });

    const tabla = screen.getByRole('table');
    expect(within(tabla).queryByText('LOTE-A')).not.toBeInTheDocument();
    expect(within(tabla).getByText('LOTE-B')).toBeInTheDocument();
  });

  it('valida que la fecha inicial no sea posterior a la final', () => {
    render(<HistorialPrecioProductoModal producto={producto} isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-03-01' } });

    expect(screen.getByRole('alert')).toHaveTextContent('La fecha inicial no puede ser posterior');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
