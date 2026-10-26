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

  it('renombra una caja sin permitir cambiar su sucursal', async () => {
    const user = userEvent.setup();
    render(<AdministracionCajas />);

    await user.click(screen.getByRole('button', { name: 'Editar Caja principal' }));
    expect(screen.getByLabelText('Sucursal')).toBeDisabled();
    const nombre = screen.getByLabelText('Nombre de la caja');
    expect(nombre).toHaveValue('Caja principal');
    await user.clear(nombre);
    await user.type(nombre, 'Caja de mostrador');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(actualizar).toHaveBeenCalledWith(3, { nombre: 'Caja de mostrador' });
    expect(screen.queryByLabelText('Nombre de la caja')).not.toBeInTheDocument();
  });

  it('no guarda una caja con nombre vacío', async () => {
    const user = userEvent.setup();
    render(<AdministracionCajas />);

    await user.click(screen.getByRole('button', { name: 'Nueva caja' }));
    await user.type(screen.getByLabelText('Nombre de la caja'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear caja' }));

    expect(screen.getByText('Completa todos los campos del formulario.')).toBeInTheDocument();
    expect(crear).not.toHaveBeenCalled();
  });

  it('muestra el error del backend al guardar y mantiene el formulario abierto', async () => {
    const user = userEvent.setup();
    crear.mockRejectedValue(new Error('Ya existe una caja con ese nombre en la sucursal'));
    render(<AdministracionCajas />);

    await user.click(screen.getByRole('button', { name: 'Nueva caja' }));
    await user.type(screen.getByLabelText('Nombre de la caja'), 'Caja principal');
    await user.click(screen.getByRole('button', { name: 'Crear caja' }));

    expect(await screen.findByText('Ya existe una caja con ese nombre en la sucursal')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la caja')).toBeInTheDocument();
  });

  it('reactiva una caja inactiva y muestra el error si falla', async () => {
    const user = userEvent.setup();
    useAdministracionCajas.mockReturnValue({
      cajas: [{ ...cajas[0], activa: false }],
      cargando: false,
      error: null,
      crear,
      actualizar,
    });
    actualizar.mockRejectedValue(new Error('No se puede activar la caja'));
    render(<AdministracionCajas />);

    expect(screen.getByText('Inactiva')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activar Caja principal' }));

    expect(actualizar).toHaveBeenCalledWith(3, { activa: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede activar la caja');
  });

  it('cierra el formulario sin guardar', async () => {
    const user = userEvent.setup();
    render(<AdministracionCajas />);

    await user.click(screen.getByRole('button', { name: 'Nueva caja' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('Nombre de la caja')).not.toBeInTheDocument();
  });

  it('muestra los errores de carga', () => {
    useAdministracionCajas.mockReturnValue({ cajas: [], cargando: false, error: 'No se pudieron cargar las cajas.', crear, actualizar });
    render(<AdministracionCajas />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las cajas.');
  });
});
