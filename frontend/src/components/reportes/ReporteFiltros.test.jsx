import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReporteFiltros from './ReporteFiltros';

const filtros = {
  id_sucursal: '',
  fecha_desde: '2026-08-05',
  fecha_hasta: '2026-09-03',
  agrupacion: 'dia',
};

const renderizarFiltros = (props = {}) => {
  const propiedades = {
    filtros,
    sucursales: [{ id_sucursal: 2, nombre_sucursal: 'Sucursal Central' }],
    cargandoSucursales: false,
    errorSucursales: null,
    errorFiltros: null,
    onFiltroChange: vi.fn(),
    onAplicar: vi.fn(),
    onRestablecer: vi.fn(),
    ...props,
  };

  render(<ReporteFiltros {...propiedades} />);
  return propiedades;
};

describe('ReporteFiltros', () => {
  it('expone los filtros requeridos y aplica el formulario', () => {
    const propiedades = renderizarFiltros();

    expect(screen.getByLabelText('Sucursal')).toHaveValue('');
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-08-05');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-09-03');
    expect(screen.getByLabelText('Agrupar por')).toHaveValue('dia');

    fireEvent.change(screen.getByLabelText('Sucursal'), { target: { value: '2' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Filtros de reportes' }));

    expect(propiedades.onFiltroChange).toHaveBeenCalledWith('id_sucursal', '2');
    expect(propiedades.onAplicar).toHaveBeenCalledOnce();
  });

  it('permite restablecer los filtros', () => {
    const propiedades = renderizarFiltros();

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer filtros' }));

    expect(propiedades.onRestablecer).toHaveBeenCalledOnce();
  });

  it('permite escribir la fecha y abre el calendario desde el campo o el icono', () => {
    const propiedades = renderizarFiltros();
    const campoDesde = screen.getByLabelText('Desde');
    const showPicker = vi.fn();
    campoDesde.showPicker = showPicker;

    fireEvent.change(campoDesde, { target: { value: '2026-08-10' } });
    expect(propiedades.onFiltroChange).toHaveBeenCalledWith('fecha_desde', '2026-08-10');

    fireEvent.click(campoDesde);
    expect(showPicker).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario de fecha inicial' }));
    expect(showPicker).toHaveBeenCalledTimes(2);
  });

  it('muestra los errores sin ocultar el formulario', () => {
    renderizarFiltros({ errorFiltros: 'La fecha inicial no es válida.' });

    expect(screen.getByRole('alert')).toHaveTextContent('La fecha inicial no es válida.');
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeInTheDocument();
  });

  it('presenta la variante compacta mientras carga sucursales y comunica el error', () => {
    renderizarFiltros({
      mostrarAgrupacion: false,
      sucursales: [],
      cargandoSucursales: true,
      errorSucursales: 'No se pudieron cargar las sucursales.',
    });

    expect(screen.queryByRole('combobox', { name: 'Agrupar por' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sucursal' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Cargando sucursales…' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las sucursales.');
  });

  it('mantiene operable el control si el navegador no ofrece selector nativo', () => {
    renderizarFiltros();
    const campoHasta = screen.getByLabelText('Hasta');
    campoHasta.showPicker = undefined;

    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario de fecha final' }));
    }).not.toThrow();
  });

  it('tolera que el navegador rechace la apertura del selector de fecha', () => {
    renderizarFiltros();
    const campoDesde = screen.getByLabelText('Desde');
    campoDesde.showPicker = vi.fn(() => { throw new DOMException('Bloqueado', 'NotAllowedError'); });

    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario de fecha inicial' }));
    }).not.toThrow();
  });
});
