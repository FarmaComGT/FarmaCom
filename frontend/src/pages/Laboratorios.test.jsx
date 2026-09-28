import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Laboratorios from './Laboratorios.jsx';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
}));

vi.mock('../hooks/useLaboratorios', () => ({
  default: () => ({
    laboratorios: [{
      id_laboratorio: 1,
      nombre_laboratorio: 'Laboratorio Central',
      id_ciudad: 2,
      direccion: 'Zona 1',
    }],
    cargando: false,
    error: null,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
  }),
}));

vi.mock('../hooks/useCiudades', () => ({
  default: () => ({
    ciudades: [{ id_ciudad: 2, nombre_ciudad: 'Guatemala' }],
    cargandoCiudades: false,
    errorCiudades: null,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Laboratorios />
  </MemoryRouter>,
);

describe('pantalla de laboratorios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra la ubicación registrada y permite buscarla', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Laboratorio Central')).toBeInTheDocument();
    expect(screen.getByText('Guatemala')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar laboratorios' }), 'petén');
    expect(screen.getByText('No hay laboratorios para mostrar.')).toBeInTheDocument();
  });

  it('registra un laboratorio con nombre, ciudad y dirección', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_laboratorio: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo laboratorio' }));
    await user.type(screen.getByLabelText('Nombre del laboratorio'), 'Laboratorio Norte');
    await user.selectOptions(screen.getByLabelText('Ciudad'), '2');
    await user.type(screen.getByLabelText('Dirección'), 'Zona 17');
    await user.click(screen.getByRole('button', { name: 'Crear laboratorio' }));

    expect(acciones.crear).toHaveBeenCalledWith({
      nombre_laboratorio: 'Laboratorio Norte',
      id_ciudad: 2,
      direccion: 'Zona 17',
    });
  });

  it('carga y guarda los datos del laboratorio al editar', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_laboratorio: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar Laboratorio Central' }));
    const direccion = screen.getByLabelText('Dirección');
    await user.clear(direccion);
    await user.type(direccion, 'Zona 10');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(acciones.actualizar).toHaveBeenCalledWith(1, {
      nombre_laboratorio: 'Laboratorio Central',
      id_ciudad: 2,
      direccion: 'Zona 10',
    });
  });
});
