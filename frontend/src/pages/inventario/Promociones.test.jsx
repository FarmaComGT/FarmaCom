import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import api from '../../api/axios';
import Promociones from './Promociones';
import { elegirAccion } from '../../test/menuAcciones';

const mocks = vi.hoisted(() => ({ crear: vi.fn(), actualizar: vi.fn(), cambiarEstado: vi.fn(), refrescar: vi.fn(), consulta: vi.fn(), usuario: { rol: 'administrador' }, promociones: [] }));
vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ sucursalActivaId: 1, usuario: mocks.usuario }) }));
vi.mock('../../hooks/useSucursales', () => ({ default: () => ({ sucursales: [{ id_sucursal: 1, nombre_sucursal: 'Centro' }, { id_sucursal: 2, nombre_sucursal: 'Norte' }] }) }));
vi.mock('../../hooks/usePromociones', () => ({ default: (id, filtros) => {
  mocks.consulta(id, filtros);
  return { promociones: mocks.promociones, paginacion: { pagina: 1, limite: 25, total: mocks.promociones.length, total_paginas: 1 }, cargando: false, crear: mocks.crear, actualizar: mocks.actualizar, cambiarEstado: mocks.cambiarEstado, refrescar: mocks.refrescar };
} }));
const producto = { id_producto: 4, codigo: 'MED-004', nombre_comercial: 'Paracetamol', concentracion: '500 mg', presentacion: 'Caja' };
const promocion = { ...producto, id_promocion: 8, nombre: 'Mayoreo central', id_sucursal: 1, nombre_sucursal: 'Centro', cantidad_minima: 6, precio_promocion: 8, fecha_inicio: '2000-01-01', fecha_fin: null, activo: true };
const Ubicacion = () => <output aria-label="URL">{useLocation().search}</output>;
const mostrar = (ruta = '/inventario/promociones') => render(<ToastProvider><MemoryRouter initialEntries={[ruta]}><Promociones/><Ubicacion/></MemoryRouter></ToastProvider>);
async function nueva(usuario) {
  await usuario.click(screen.getByRole('button', { name: 'Nueva promoción' }));
  await usuario.type(await screen.findByRole('searchbox', { name: 'Buscar producto' }), 'Paracetamol');
  await usuario.click(await screen.findByRole('button', { name: /Paracetamol.*MED-004/ }));
  await waitFor(() => expect(screen.getByText(/Precio normal mínimo actual/)).toBeInTheDocument());
}
async function precio(usuario) {
  await usuario.clear(screen.getByLabelText('Cantidad mínima por venta'));
  await usuario.type(screen.getByLabelText('Cantidad mínima por venta'), '6');
  await usuario.type(screen.getByLabelText('Precio por unidad (Q)'), '8');
}

describe('promociones generales', () => {
  it('guarda un cupo acumulado y valida el mínimo antes de enviar', async () => {
    const usuario = userEvent.setup(); mostrar(); await nueva(usuario); await precio(usuario);
    const maxima = screen.getByLabelText(/Cantidad máxima acumulada/);
    await usuario.type(maxima, '5');
    await usuario.click(screen.getByRole('checkbox', { name: 'Sin fecha de finalización' }));
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    expect(maxima).toHaveFocus(); expect(mocks.crear).not.toHaveBeenCalled();
    await usuario.clear(maxima); await usuario.type(maxima, '100');
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    await waitFor(() => expect(mocks.crear).toHaveBeenCalledWith(expect.objectContaining({ cantidad_maxima: 100 })));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usuario = { rol: 'administrador' }; mocks.promociones = [promocion];
    mocks.crear.mockResolvedValue({}); mocks.actualizar.mockResolvedValue({}); mocks.cambiarEstado.mockResolvedValue({});
    api.get.mockImplementation(async (url) => ({ data: url.endsWith('/referencia') ? { precio_minimo: 10 } : url === '/productos/seleccion' ? [producto] : url.startsWith('/promociones/') ? promocion : producto }));
  });
  it('muestra promociones generales sin seleccionar el primer producto', () => {
    mostrar();
    expect(mocks.consulta).toHaveBeenLastCalledWith(null, expect.objectContaining({ global: true, estado: 'vigente', id_sucursal: '1' }));
    expect(screen.getByText('Mayoreo central')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Producto' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sin fecha de fin/)).toBeInTheDocument();
  });
  it('refleja búsqueda, estado y sucursal en la URL y consulta el servidor', async () => {
    const usuario = userEvent.setup(); mostrar();
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar promociones' }), 'Mayoreo');
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'programada');
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Sucursal' }), '2');
    await waitFor(() => expect(mocks.consulta).toHaveBeenLastCalledWith(null, expect.objectContaining({ busqueda: 'Mayoreo', estado: 'programada', id_sucursal: '2' })));
    expect(screen.getByLabelText('URL')).toHaveTextContent('q=Mayoreo');
  });
  it('crea con producto elegido en el formulario, nombre y vigencia abierta', async () => {
    const usuario = userEvent.setup(); mostrar(); await nueva(usuario); await precio(usuario);
    await usuario.type(screen.getByLabelText(/Nombre/), ' Mayoreo ');
    await usuario.click(screen.getByRole('checkbox', { name: 'Sin fecha de finalización' }));
    expect(screen.getByLabelText('Fecha de finalización')).toBeDisabled();
    expect(screen.getByText(/Desde 6 unidades por venta, cada unidad cuesta/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    await waitFor(() => expect(mocks.crear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Mayoreo', id_producto: 4, id_sucursal: 1, cantidad_minima: 6, precio_promocion: 8, fecha_fin: null })));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('permite el nombre automático y exige una fecha final salvo elección explícita', async () => {
    const usuario = userEvent.setup(); mostrar(); await nueva(usuario); await precio(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    expect(await screen.findByText(/Selecciona la fecha de finalización o marca/)).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de finalización')).toHaveFocus();
    await usuario.type(screen.getByLabelText('Fecha de finalización'), '2099-12-31');
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    await waitFor(() => expect(mocks.crear).toHaveBeenCalledWith(expect.objectContaining({ nombre: null, fecha_fin: '2099-12-31' })));
  });
  it('permite enviar incompleto y enfoca el primer error', async () => {
    const usuario = userEvent.setup(); mostrar();
    await usuario.click(screen.getByRole('button', { name: 'Nueva promoción' }));
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    expect(await screen.findByText('Busca y selecciona un producto.')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar producto' })).toHaveFocus();
    expect(mocks.crear).not.toHaveBeenCalled();
  });
  it('abre el formulario desde inventario con el producto precargado', async () => {
    mostrar('/inventario/promociones?producto=4&crear=1&sucursal=2');
    const dialogo = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialogo).getByText('Paracetamol')).toBeInTheDocument());
    expect(within(dialogo).getByLabelText('Sucursal')).toHaveValue('2');
    expect(within(dialogo).queryByRole('searchbox')).not.toBeInTheDocument();
  });
  it('edita sin cambiar producto o sucursal y admite quitar la fecha final', async () => {
    api.get.mockImplementation(async (url) => ({ data: url.endsWith('/referencia') ? { precio_minimo: 10 } : { ...promocion, fecha_fin: '2099-01-01' } }));
    const usuario = userEvent.setup(); mostrar('/inventario/promociones?editar=8');
    await screen.findByDisplayValue('Mayoreo central');
    await waitFor(() => expect(screen.getByText(/Precio normal mínimo actual/)).toBeInTheDocument());
    expect(within(screen.getByRole('dialog')).getByLabelText('Sucursal')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cambiar producto' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('checkbox', { name: 'Sin fecha de finalización' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.actualizar).toHaveBeenCalledWith(8, expect.objectContaining({ fecha_fin: null })));
  });
  it('conserva lo escrito tras un conflicto y permite abrir la promoción existente', async () => {
    mocks.crear.mockRejectedValue({ response: { data: { mensaje: 'Ya existe una promoción activa', errores: [{ campo: 'fecha_inicio', id_promocion: 9, nombre: 'Otra promoción' }] } } });
    const usuario = userEvent.setup(); mostrar(); await nueva(usuario); await precio(usuario);
    await usuario.click(screen.getByRole('checkbox', { name: 'Sin fecha de finalización' }));
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    const enlace = await screen.findByRole('link', { name: /Abrir promoción existente/ });
    expect(enlace).toHaveAttribute('href', '/inventario/promociones?editar=9');
    expect(screen.getByLabelText('Precio por unidad (Q)')).toHaveValue(8);
  });
  it('impide guardar un precio igual al normal', async () => {
    const usuario = userEvent.setup(); mostrar(); await nueva(usuario);
    await usuario.type(screen.getByLabelText('Precio por unidad (Q)'), '10');
    await usuario.click(screen.getByRole('checkbox', { name: 'Sin fecha de finalización' }));
    await usuario.click(screen.getByRole('button', { name: 'Crear promoción', exact: true }));
    expect(screen.getByText('El precio debe ser menor que el precio normal mínimo.')).toBeInTheDocument();
    expect(mocks.crear).not.toHaveBeenCalled();
  });
  it('el dependiente consulta su sucursal y no ve acciones de administración', () => {
    mocks.usuario = { rol: 'dependiente', id_sucursal: 2 };
    mostrar('/inventario/promociones?sucursal=1');
    expect(mocks.consulta).toHaveBeenLastCalledWith(null, expect.objectContaining({ id_sucursal: '2' }));
    expect(screen.queryByRole('button', { name: 'Nueva promoción' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
  });
  it('muestra confirmación propia y conserva errores al cambiar estado', async () => {
    mocks.cambiarEstado.mockRejectedValue(new Error('No se pudo cambiar'));
    const usuario = userEvent.setup(); mostrar();
    await elegirAccion(usuario, 'Mayoreo central', 'Desactivar');
    const dialogo = screen.getByRole('dialog', { name: 'Desactivar promoción' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Desactivar', exact: true }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('No se pudo cambiar');
  });
});
