import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerCajas } from '../../api/cajas';
import useHistorialCaja from '../../hooks/useHistorialCaja';
import useSucursales from '../../hooks/useSucursales';
import HistorialCaja from './HistorialCaja';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { rol: 'administrador' } }),
}));

vi.mock('../../api/cajas', () => ({ obtenerCajas: vi.fn() }));
vi.mock('../../hooks/useHistorialCaja', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useSucursales', () => ({ default: vi.fn() }));
vi.mock('../../components/caja/CajaSubNav', () => ({
  default: () => <nav>Pestañas de caja</nav>,
}));

const cierres = [{
  id_sesion_caja: 9,
  fecha_hora_cierre: '2026-09-28T18:30:00.000Z',
  nombre_sucursal: 'Sucursal Central',
  nombre_caja: 'Caja principal',
  turno: 'tarde',
  total_ventas: '500.00',
  efectivo_esperado: '350.00',
  efectivo_contado: '345.00',
  diferencia_efectivo: '-5.00',
  usuario_cierre: 'Ana Administradora',
}];

describe('HistorialCaja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSucursales.mockReturnValue({
      sucursales: [{ id_sucursal: 2, nombre_sucursal: 'Sucursal Central' }],
      cargando: false,
      error: null,
    });
    useHistorialCaja.mockReturnValue({ cierres, cargando: false, error: null });
    obtenerCajas.mockResolvedValue([{ id_caja: 3, nombre: 'Caja principal' }]);
  });

  it('muestra los cierres con sus montos principales', () => {
    render(<HistorialCaja />);

    const fila = screen.getByText('Ana Administradora').closest('tr');
    expect(within(fila).getByText('Sucursal Central')).toBeInTheDocument();
    expect(within(fila).getByText('Caja principal')).toBeInTheDocument();
    expect(within(fila).getByText(/Q\s*500\.00/)).toBeInTheDocument();
    expect(within(fila).getByText(/-Q\s*5\.00/)).toBeInTheDocument();
  });

  it('carga las cajas de la sucursal y aplica los filtros elegidos', async () => {
    const user = userEvent.setup();
    render(<HistorialCaja />);

    await user.selectOptions(screen.getByLabelText('Sucursal'), '2');
    expect(await screen.findByRole('option', { name: 'Caja principal' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Caja'), '3');
    await user.type(screen.getByLabelText('Desde'), '2026-09-01');
    await user.type(screen.getByLabelText('Hasta'), '2026-09-28');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(obtenerCajas).toHaveBeenCalledWith(
      { id_sucursal: '2' },
      { signal: expect.any(AbortSignal) },
    );
    expect(useHistorialCaja).toHaveBeenLastCalledWith({
      id_sucursal: '2',
      id_caja: '3',
      fecha_desde: '2026-09-01',
      fecha_hasta: '2026-09-28',
    });
  });

  it('muestra el estado vacío y los errores de consulta', () => {
    useHistorialCaja.mockReturnValue({
      cierres: [],
      cargando: false,
      error: 'No fue posible consultar los cierres.',
    });
    render(<HistorialCaja />);

    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible consultar los cierres.');
    expect(screen.getByText(/No hay cierres que coincidan/)).toBeInTheDocument();
  });
});
