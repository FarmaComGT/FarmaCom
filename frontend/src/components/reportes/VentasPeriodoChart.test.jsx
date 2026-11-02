import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VentasPeriodoChart from './VentasPeriodoChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="contenedor-responsive">{children}</div>,
  BarChart: ({ children, data }) => (
    <div data-testid="grafica-barras" data-periodos={data.length}>{children}</div>
  ),
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Bar: () => <div data-testid="serie-ingresos" />,
}));

const datos = [
  {
    periodo: '2026-08-01',
    ingresos: 150.5,
    total_ventas: 3,
    ticket_promedio: 50.17,
    unidades_vendidas: 8,
  },
  {
    periodo: '2026-08-02',
    ingresos: 220,
    total_ventas: 4,
    ticket_promedio: 55,
    unidades_vendidas: 11,
  },
];

describe('VentasPeriodoChart', () => {
  it('renderiza la serie y una alternativa tabular accesible', () => {
    render(
      <VentasPeriodoChart
        datos={datos}
        agrupacion="dia"
        cargando={false}
        error={null}
        onReintentar={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Ingresos por período' })).toBeInTheDocument();
    expect(screen.getByText('Por día')).toBeInTheDocument();
    expect(screen.getByTestId('grafica-barras')).toHaveAttribute('data-periodos', '2');
    expect(screen.getByTestId('serie-ingresos')).toBeInTheDocument();
    expect(screen.getByTestId('grafica-ingresos-contenedor')).toHaveStyle({ height: '320px' });

    const tabla = screen.getByRole('table', { name: 'Detalle de ingresos por período' });
    expect(within(tabla).getByText('01/08/2026')).toBeInTheDocument();
    expect(within(tabla).getByText(/Q.*150\.50/)).toBeInTheDocument();
  });

  it('muestra un estado de carga', () => {
    render(
      <VentasPeriodoChart
        datos={[]}
        agrupacion="semana"
        cargando
        error={null}
        onReintentar={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Cargando gráfica de ingresos')).toBeInTheDocument();
    expect(screen.queryByTestId('grafica-barras')).not.toBeInTheDocument();
  });

  it('muestra un estado vacío cuando ningún período tiene ingresos', () => {
    render(
      <VentasPeriodoChart
        datos={[{ ...datos[0], ingresos: 0 }]}
        agrupacion="mes"
        cargando={false}
        error={null}
        onReintentar={vi.fn()}
      />,
    );

    expect(screen.getByText('No hay ventas en el período seleccionado.')).toBeInTheDocument();
    expect(screen.queryByTestId('grafica-barras')).not.toBeInTheDocument();
  });

  it('muestra el error de la serie y permite reintentar', () => {
    const onReintentar = vi.fn();
    render(
      <VentasPeriodoChart
        datos={[]}
        agrupacion="dia"
        cargando={false}
        error="No se pudo cargar la evolución de ventas."
        onReintentar={onReintentar}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la evolución de ventas.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledOnce();
  });

  it('usa la agrupacion diaria como respaldo ante un criterio desconocido', () => {
    render(
      <VentasPeriodoChart
        datos={[]}
        agrupacion="desconocida"
        cargando={false}
        error={null}
        onReintentar={vi.fn()}
      />,
    );

    expect(screen.getByText(/Por d.a/)).toBeInTheDocument();
  });
});
