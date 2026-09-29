import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAdministracionCajas from '../../hooks/useAdministracionCajas';
import useSucursales from '../../hooks/useSucursales';
import AdministracionCajas from './AdministracionCajas';

const crear = vi.fn();
const actualizar = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    usuario: { rol: 'administrador', id_sucursal: 2 },
  }),
}));
vi.mock('../../hooks/useAdministracionCajas', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useSucursales', () => ({ default: vi.fn() }));
vi.mock('../../components/caja/CajaSubNav', () => ({ default: () => <nav>Caja</nav> }));

const cajas = [{
  id_caja: 3,
  id_sucursal: 2,
  nombre: 'Caja principal',
  nombre_sucursal: 'Sucursal Central',
  activa: true,
}];

describe('AdministracionCajas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    crear.mockResolvedValue({});
    actualizar.mockResolvedValue({});
    useAdministracionCajas.mockReturnValue({
      cajas,
      cargando: false,
      error: null,
      crear,
      actualizar,
    });
    useSucursales.mockReturnValue({
      sucursales: [{ id_sucursal: 2, nombre_sucursal: 'Sucursal Central' }],
      cargando: false,
      error: null,
    });
  });

  it('muestra y filtra las cajas registradas', async () => {
    const user = userEvent.setup();
    render(<AdministracionCajas />);

    expect(screen.getByText('Caja principal')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Buscar cajas'), 'otra');
    expect(screen.getByText('No hay cajas para mostrar.')).toBeInTheDocument();
  });

  it('crea una caja con la sucursal actual preseleccionada', async () => {
    const user = userEvent.setup();
    render(<AdministracionCajas />);

    await user.click(screen.getByRole('button', { name: 'Nueva caja' }));
    expect(screen.getByLabelText('Sucursal')).toHaveValue('2');
    await user.type(screen.getByLabelText('Nombre de la caja'), 'Caja auxiliar');
    await user.click(screen.getByRole('button', { name: 'Crear caja' }));

    expect(crear).toHaveBeenCalledWith({ id_sucursal: 2, nombre: 'Caja auxiliar' });
  });

  it('permite desactivar una caja desde el switch', async () => {
    const user = userEvent.setup();
    render(<AdministracionCajas />);

    await user.click(screen.getByRole('button', { name: 'Desactivar Caja principal' }));

    expect(actualizar).toHaveBeenCalledWith(3, { activa: false });
  });
});
