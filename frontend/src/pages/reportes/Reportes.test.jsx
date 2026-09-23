import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Reportes from './Reportes';
import ReportesLayout from '../../layouts/ReportesLayout';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const controles = vi.hoisted(() => ({
  actualizarFiltro: vi.fn(),
  aplicarFiltros: vi.fn(),
  cambiarCriterio: vi.fn(),
  restablecerFiltros: vi.fn(),
  recargar: vi.fn(),
}));

vi.mock('../../hooks/useFiltrosReportes', () => ({
  default: () => ({
    filtrosEdicion: {
      id_sucursal: '',
      fecha_desde: '2026-08-05',
      fecha_hasta: '2026-09-03',
      agrupacion: 'dia',
    },
    filtrosAplicados: {
      fecha_desde: '2026-08-05',
      fecha_hasta: '2026-09-03',
      agrupacion: 'dia',
      criterio: 'cantidad',
    },
    errorFiltros: null,
    actualizarFiltro: controles.actualizarFiltro,
    aplicarFiltros: controles.aplicarFiltros,
    cambiarCriterio: controles.cambiarCriterio,
    restablecerFiltros: controles.restablecerFiltros,
  }),
}));

vi.mock('../../hooks/useReportes', () => ({
  default: () => ({
    rentabilidad: { datos: [], cargando: false, error: null },
    resumen: {
      datos: {
        ingresos_totales: 500,
        total_ventas: 10,
        ticket_promedio: 50,
        unidades_vendidas: 24,
      },
      cargando: false,
      error: null,
    },
    serie: {
      datos: [{
        periodo: '2026-08-05',
        ingresos: 500,
        total_ventas: 10,
        ticket_promedio: 50,
        unidades_vendidas: 24,
      }],
      cargando: false,
      error: null,
    },
    metodosPago: {
      datos: [
        {
          metodo_pago: 'efectivo',
          total_ventas: 6,
          ingresos: 300,
          porcentaje_ingresos: 60,
        },
        {
          metodo_pago: 'tarjeta',
          total_ventas: 4,
          ingresos: 200,
          porcentaje_ingresos: 40,
        },
      ],
      cargando: false,
      error: null,
    },
    topProductos: {
      datos: [{
        id_producto: 3,
        codigo: 'MED-003',
        nombre_comercial: 'Acetaminofén',
        nombre_generico: 'Paracetamol',
        cantidad_vendida: 25,
        ingresos_generados: 375,
      }],
      cargando: false,
      error: null,
    },
    recargar: controles.recargar,
  }),
}));

vi.mock('../../hooks/useSucursales', () => ({
  default: () => ({
    sucursales: [],
    cargando: false,
    error: null,
  }),
}));

describe('Reportes', () => {
  it('cambia el criterio del ranking sin aplicar todos los filtros', async () => {
    render(<MemoryRouter><Routes><Route element={<ReportesLayout />}><Route path="/" element={<Reportes />} /></Route></Routes></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Ingresos' }));
    expect(controles.cambiarCriterio).toHaveBeenCalledWith('ingresos');
    expect(controles.aplicarFiltros).not.toHaveBeenCalled();
  });

  it('presenta un encabezado puntual para la vista', () => {
    render(<MemoryRouter><Routes><Route element={<ReportesLayout />}><Route path="/" element={<Reportes />} /></Route></Routes></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
    expect(screen.queryByText('Análisis comercial')).not.toBeInTheDocument();
    expect(screen.queryByText('Información consolidada')).not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Filtros de reportes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rentabilidad por sucursal' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rentabilidad por sucursal' })).toHaveAttribute('href', '/reports/rentabilidad');
    expect(screen.getByRole('heading', { name: 'Ingresos por período' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Métodos de pago' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Productos más vendidos' })).toBeInTheDocument();
  });
});
