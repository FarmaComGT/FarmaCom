import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RentabilidadSucursal from './RentabilidadSucursal';
import { formatearMoneda, formatearMargen, normalizarRentabilidad, resumirRentabilidad } from '../../utils/reportes';

const datos = [
  { id_sucursal: 1, nombre_sucursal: 'Centro', ingresos: 900, costo: 450, utilidad: 450, margen: 50 },
  { id_sucursal: 2, nombre_sucursal: 'Norte', ingresos: 100, costo: 150, utilidad: -50, margen: -50 },
];

describe('RentabilidadSucursal', () => {
  it('compara sucursales y calcula el margen consolidado ponderado', () => {
    render(<RentabilidadSucursal datos={datos} />);
    expect(screen.getByRole('heading', { name: 'Rentabilidad de todas las sucursales' })).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Ingresos de rentabilidad' })).getByText(formatearMoneda(1000), { normalizer: (texto) => texto })).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Utilidad de rentabilidad' })).getByText(formatearMoneda(400), { normalizer: (texto) => texto })).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Margen de rentabilidad' })).getByText(formatearMargen(40))).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Costos de rentabilidad' })).getByText(formatearMoneda(600), { normalizer: (texto) => texto })).toBeInTheDocument();
    const fila = screen.getByRole('row', { name: /Norte/ });
    expect(within(fila).getByText(formatearMoneda(-50), { normalizer: (texto) => texto })).toHaveClass('text-error');
    expect(within(fila).getByText(formatearMargen(-50))).toBeInTheDocument();
  });

  it('mantiene sucursales sin ventas con margen cero', () => {
    const sinVentas = [{ id_sucursal: 3, nombre_sucursal: 'Sur', ingresos: 0, costo: 0, utilidad: 0, margen: 0 }];
    render(<RentabilidadSucursal datos={sinVentas} />);
    expect(screen.getByRole('row', { name: /Sur/ })).toBeInTheDocument();
    expect(resumirRentabilidad(sinVentas).margen).toBe(0);
    expect(normalizarRentabilidad(null)).toEqual([]);
  });

  it('muestra solo los importes de la sucursal seleccionada y oculta el desglose', () => {
    const { rerender } = render(<RentabilidadSucursal datos={datos} idSucursal="2" nombreSucursal="Norte" />);
    expect(screen.getByRole('heading', { name: 'Rentabilidad de Norte' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Ingresos de rentabilidad' })).getByText(formatearMoneda(100), { normalizer: (texto) => texto })).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Margen de rentabilidad' })).getByText(formatearMargen(-50))).toBeInTheDocument();
    rerender(<RentabilidadSucursal datos={datos} idSucursal="" />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rentabilidad de todas las sucursales' })).toBeInTheDocument();
  });

  it('oculta resultados anteriores mientras carga y presenta el estado vacío', () => {
    const { rerender } = render(<RentabilidadSucursal datos={datos} cargando />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando rentabilidad');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    rerender(<RentabilidadSucursal datos={[]} />);
    expect(screen.getByText('No hay datos de rentabilidad para los filtros seleccionados.')).toBeInTheDocument();
  });

  it('permite reintentar después de un error', async () => {
    const onReintentar = vi.fn();
    render(<RentabilidadSucursal datos={datos} error="No se pudo cargar la rentabilidad." onReintentar={onReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledOnce();
  });
});
