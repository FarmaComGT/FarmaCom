import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Promociones from './Promociones';

const estado = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarEstado: vi.fn(),
  productos: [],
  lotes: [],
  promociones: [],
  errorPromociones: null,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ sucursalActivaId: 1, usuario: { rol: 'administrador' } }),
}));

vi.mock('../../hooks/useProductos', () => ({
  default: () => ({ productos: estado.productos, cargando: false, error: null }),
}));

vi.mock('../../hooks/useSucursales', () => ({
  default: () => ({
    sucursales: [
      { id_sucursal: 1, nombre_sucursal: 'Sucursal Centro' },
      { id_sucursal: 2, nombre_sucursal: 'Sucursal Norte' },
    ],
    cargando: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useLotesProducto', () => ({
  default: () => ({ lotes: estado.lotes, cargando: false, error: null }),
}));

vi.mock('../../hooks/usePromociones', () => ({
  default: () => ({
    promociones: estado.promociones,
    cargando: false,
    error: estado.errorPromociones,
    crear: estado.crear,
    actualizar: estado.actualizar,
    cambiarEstado: estado.cambiarEstado,
  }),
}));

const promocionVigente = {
  id_promocion: 8,
  id_sucursal: 1,
  nombre_sucursal: 'Sucursal Centro',
  cantidad_minima: 3,
  precio_promocion: 7.5,
  fecha_inicio: '2000-01-01',
  fecha_fin: '2099-12-31',
  activo: true,
};

const renderizar = () => render(
  <MemoryRouter>
    <Promociones />
  </MemoryRouter>,
);

const abrirNueva = async (user) => {
  const botonNueva = screen.getByRole('button', { name: 'Nueva promoción' });
  await waitFor(() => expect(botonNueva).toBeEnabled());
  await user.click(botonNueva);
};

const llenarFormulario = async (user, { precio = '6.25', inicio = '2026-11-01', fin = '2026-11-30' } = {}) => {
  await user.clear(screen.getByLabelText('Cantidad mínima'));
  await user.type(screen.getByLabelText('Cantidad mínima'), '5');
  await user.type(screen.getByLabelText('Precio promocional (Q)'), precio);
  await user.type(screen.getByLabelText('Fecha de inicio'), inicio);
  await user.type(screen.getByLabelText('Fecha de finalización'), fin);
};

describe('pantalla de promociones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.productos = [
      { id_producto: 4, codigo: 'MED-004', nombre_comercial: 'Paracetamol', nombre_generico: 'Acetaminofén' },
      { id_producto: 5, codigo: 'MED-005', nombre_comercial: 'Amoxil', nombre_generico: 'Amoxicilina' },
    ];
    estado.lotes = [{ id_lote: 1, id_sucursal: 1, stock_actual: 10, precio_venta: 10, estado_vencimiento: 'normal' }];
    estado.promociones = [promocionVigente];
    estado.errorPromociones = null;
    estado.crear.mockResolvedValue({ id_promocion: 9 });
    estado.actualizar.mockResolvedValue({});
    estado.cambiarEstado.mockResolvedValue({});
  });

  it('crea una promoción para el producto y sucursal seleccionados', async () => {
    const user = userEvent.setup();
    renderizar();

    await abrirNueva(user);
    await llenarFormulario(user);
    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    expect(estado.crear).toHaveBeenCalledWith({
      id_sucursal: 1,
      cantidad_minima: 5,
      precio_promocion: 6.25,
      fecha_inicio: '2026-11-01',
      fecha_fin: '2026-11-30',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Promoción creada correctamente.');
  });

  it('permite desactivar una promoción vigente', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Desactivar promoción 8' }));

    expect(estado.cambiarEstado).toHaveBeenCalledWith(8, false);
    expect(await screen.findByRole('status')).toHaveTextContent('Promoción desactivada correctamente.');
  });

  it('limita el precio promocional por debajo del menor precio normal disponible', async () => {
    const user = userEvent.setup();
    renderizar();

    await abrirNueva(user);
    const precio = screen.getByLabelText('Precio promocional (Q)');
    await llenarFormulario(user, { precio: '10' });
    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    expect(precio).toHaveAttribute('max', '9.99');
    expect(precio).toBeInvalid();
    expect(estado.crear).not.toHaveBeenCalled();
  });

  it('rechaza una fecha de finalización anterior al inicio', async () => {
    const user = userEvent.setup();
    renderizar();

    await abrirNueva(user);
    await llenarFormulario(user, { inicio: '2026-11-30', fin: '2026-11-01' });
    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    expect(screen.getByText('La fecha de finalización debe ser posterior a la fecha de inicio.')).toBeInTheDocument();
    expect(estado.crear).not.toHaveBeenCalled();
  });

  it('no permite crear si la sucursal no tiene lotes vendibles con precio', async () => {
    const user = userEvent.setup();
    estado.lotes = [{ id_lote: 1, id_sucursal: 1, stock_actual: 0, precio_venta: 10, estado_vencimiento: 'normal' }];
    renderizar();

    await abrirNueva(user);

    expect(screen.getByText('No hay lotes vendibles con precio en esta sucursal.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear promoción' })).toBeDisabled();
  });

  it('muestra el error del backend al guardar y mantiene el formulario abierto', async () => {
    const user = userEvent.setup();
    estado.crear.mockRejectedValue({ response: { data: { mensaje: 'Ya existe una promoción activa' } } });
    renderizar();

    await abrirNueva(user);
    await llenarFormulario(user);
    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    expect(await screen.findByText('Ya existe una promoción activa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear promoción' })).toBeInTheDocument();
  });

  it('edita una promoción con sus datos precargados', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar promoción 8' }));

    expect(screen.getByLabelText('Precio promocional (Q)')).toHaveValue(7.5);
    expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('2000-01-01');
    await user.clear(screen.getByLabelText('Precio promocional (Q)'));
    await user.type(screen.getByLabelText('Precio promocional (Q)'), '7');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(estado.actualizar).toHaveBeenCalledWith(8, {
      cantidad_minima: 3,
      precio_promocion: 7,
      fecha_inicio: '2000-01-01',
      fecha_fin: '2099-12-31',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Promoción actualizada correctamente.');
  });

  it('cierra el formulario sin guardar', async () => {
    const user = userEvent.setup();
    renderizar();

    await abrirNueva(user);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('Precio promocional (Q)')).not.toBeInTheDocument();
  });

  it('reactiva una promoción inactiva y muestra el error si falla', async () => {
    const user = userEvent.setup();
    estado.promociones = [{ ...promocionVigente, activo: false }];
    estado.cambiarEstado.mockRejectedValue({ response: { data: { mensaje: 'Se solapa con otra promoción' } } });
    renderizar();

    expect(screen.getByText('Inactiva')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activar promoción 8' }));

    expect(estado.cambiarEstado).toHaveBeenCalledWith(8, true);
    expect(await screen.findByRole('alert')).toHaveTextContent('Se solapa con otra promoción');
  });

  it('muestra si la promoción está programada, vigente o finalizada', () => {
    estado.promociones = [
      { ...promocionVigente, id_promocion: 1 },
      { ...promocionVigente, id_promocion: 2, fecha_inicio: '2099-01-01', fecha_fin: '2099-02-01' },
      { ...promocionVigente, id_promocion: 3, fecha_inicio: '2000-01-01', fecha_fin: '2000-02-01' },
    ];
    renderizar();

    expect(screen.getByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
    expect(screen.getByText('Finalizada')).toBeInTheDocument();
  });

  it('filtra las promociones por sucursal', async () => {
    const user = userEvent.setup();
    estado.promociones = [
      promocionVigente,
      { ...promocionVigente, id_promocion: 9, id_sucursal: 2, nombre_sucursal: 'Sucursal Norte' },
    ];
    renderizar();

    await user.selectOptions(screen.getByLabelText('Filtrar por sucursal'), '2');

    expect(screen.queryByRole('button', { name: 'Editar promoción 8' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar promoción 9' })).toBeInTheDocument();
  });

  it('busca productos por código o nombre', async () => {
    const user = userEvent.setup();
    renderizar();

    const selector = screen.getByLabelText('Producto');
    await user.type(screen.getByLabelText('Buscar producto'), 'amoxi');

    const opciones = within(selector).getAllByRole('option').map((opcion) => opcion.textContent);
    expect(opciones).toEqual(['Selecciona un producto', 'MED-005 · Amoxil']);
  });

  it('muestra los errores de carga', () => {
    estado.errorPromociones = 'No se pudieron cargar las promociones.';
    renderizar();

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las promociones.');
  });
});
