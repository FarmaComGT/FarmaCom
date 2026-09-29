import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerCajas } from '../../api/cajas';
import useResumenCaja from '../../hooks/useResumenCaja';
import useSucursales from '../../hooks/useSucursales';
import ResumenDiarioCaja from './ResumenDiarioCaja';

vi.mock('../../hooks/useResumenCaja', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useSucursales', () => ({ default: vi.fn() }));
vi.mock('../../api/cajas', () => ({ obtenerCajas: vi.fn() }));

const resumen = [{
  ventas_efectivo: '300.00',
  ventas_tarjeta: '200.00',
  entradas: '50.00',
  salidas: '25.00',
  diferencia_efectivo: '-5.00',
  sesiones_cerradas: 2,
  sesiones_abiertas: 1,
}];

describe('ResumenDiarioCaja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useResumenCaja.mockReturnValue({ resumen, cargando: false, error: null });
    useSucursales.mockReturnValue({
      sucursales: [{ id_sucursal: 2, nombre_sucursal: 'Sucursal Central' }],
      cargando: false,
      error: null,
    });
    obtenerCajas.mockResolvedValue([{ id_caja: 3, nombre: 'Caja principal' }]);
  });

  it('solicita una sucursal antes de presentar los totales', () => {
    render(<ResumenDiarioCaja />);

    expect(screen.getByText('Selecciona una sucursal para consultar el resumen diario.'))
      .toBeInTheDocument();
    expect(screen.queryByText('Ventas en efectivo')).not.toBeInTheDocument();
  });

  it('autoselecciona la sucursal actual del usuario', () => {
    render(<ResumenDiarioCaja idSucursalInicial={2} />);

    expect(screen.getByLabelText('Sucursal')).toHaveValue('2');
    expect(useResumenCaja).toHaveBeenLastCalledWith(expect.any(String), '2', '');
    expect(obtenerCajas).toHaveBeenCalledWith(
      { id_sucursal: '2', activa: true },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('presenta los totales desglosados para la sucursal elegida', async () => {
    const user = userEvent.setup();
    render(<ResumenDiarioCaja />);
    await user.selectOptions(screen.getByLabelText('Sucursal'), '2');

    expect(screen.getByText('Ventas en efectivo').parentElement.nextElementSibling)
      .toHaveTextContent(/Q\s*300\.00/);
    expect(screen.getByText('Ventas con tarjeta').parentElement.nextElementSibling)
      .toHaveTextContent(/Q\s*200\.00/);
    expect(screen.getByText('Sesiones cerradas').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Sesiones abiertas').parentElement.nextElementSibling)
      .toHaveTextContent('1');
  });

  it('permite elegir una caja de la sucursal y cambiar la fecha', async () => {
    const user = userEvent.setup();
    render(<ResumenDiarioCaja />);
    await user.selectOptions(screen.getByLabelText('Sucursal'), '2');
    await user.selectOptions(screen.getByLabelText('Caja'), '3');
    const fecha = screen.getByLabelText('Día que deseas consultar');

    expect(fecha).toHaveClass('cursor-pointer', 'mt-2');
    fireEvent.change(fecha, { target: { value: '2026-09-20' } });

    expect(obtenerCajas).toHaveBeenCalledWith(
      { id_sucursal: '2', activa: true },
      { signal: expect.any(AbortSignal) },
    );
    expect(useResumenCaja).toHaveBeenLastCalledWith('2026-09-20', '2', '3');
  });

  it('muestra los estados vacío y de error', () => {
    useResumenCaja.mockReturnValue({
      resumen: [],
      cargando: false,
      error: 'No se pudo cargar el resumen diario.',
    });
    render(<ResumenDiarioCaja />);
    fireEvent.change(screen.getByLabelText('Sucursal'), { target: { value: '2' } });

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el resumen diario.');
    expect(screen.getByText('No hay actividad de caja para la fecha seleccionada.'))
      .toBeInTheDocument();
  });
});
