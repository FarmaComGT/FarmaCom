import { ToastProvider } from '../../context/ToastContext.jsx';
import React from 'react';
import { fireEvent, render as renderBase, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../api/axios';
import Inventario from './Inventario.jsx';

const mocks = vi.hoisted(() => ({ crearLote: vi.fn() }));
vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sucursalActivaId: 1, usuario: { rol: 'administrador' } }),
}));
vi.mock('../../hooks/useProductos.js', () => ({
  default: () => ({ productos: [], crear: vi.fn(), actualizar: vi.fn(), cambiarEstado: vi.fn() }),
}));
vi.mock('../../hooks/useCategorias.js', () => ({ default: () => ({ categorias: [], cargando: false }) }));
vi.mock('../../hooks/useCasas.js', () => ({ default: () => ({ casas: [], cargando: false }) }));
vi.mock('../../hooks/useProveedores.js', () => ({ default: () => ({ proveedores: [], cargando: false }) }));
vi.mock('../../hooks/useSucursales.js', () => ({ default: () => ({ sucursales: [], cargando: false }) }));
vi.mock('../../hooks/usePresentaciones.js', () => ({ default: () => ({ presentaciones: [], cargando: false }) }));
vi.mock('../../hooks/useLotes.js', () => ({ default: () => ({ crear: mocks.crearLote, limpiarError: vi.fn() }) }));
vi.mock('../../components/inventario/productos/ProductoFormModal.jsx', () => ({ default: () => null }));
vi.mock('../../components/inventario/productos/HistorialPrecioProductoModal.jsx', () => ({ default: () => null }));
vi.mock('../../components/inventario/stock/LoteFormModal.jsx', () => ({
  default: ({ isOpen, onSubmit }) => isOpen
    ? <button type="button" onClick={() => onSubmit({ numero_lote: 'NUEVO' })}>Guardar lote de prueba</button> : null,
}));

const productos = Array.from({ length: 27 }, (_, indice) => ({
  id_producto: indice + 1, codigo: `MED${indice + 1}`, nombre_comercial: `Producto ${indice + 1}`,
  activo: true, estado_stock: 'normal', estado_vencimiento: 'normal', stock_total: 10,
}));
let filas;
const peticionesListado = () => api.get.mock.calls.filter(([url]) => !url.endsWith('/resumen'));

const responder = async (url, config) => {
  if (url.endsWith('/resumen')) return { data: { total_productos: filas.length } };
  const { pagina, limite, busqueda = '' } = config.params;
  const filtradas = filas.filter((producto) => producto.nombre_comercial.toLowerCase().includes(busqueda.toLowerCase()));
  const total = filtradas.length;
  const total_paginas = Math.max(1, Math.ceil(total / limite));
  const efectiva = Math.min(pagina, total_paginas);
  return { data: {
    datos: filtradas.slice((efectiva - 1) * limite, efectiva * limite),
    paginacion: { pagina: efectiva, limite, total, total_paginas },
  } };
};

function NavegacionPrueba() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output aria-label="URL actual">{location.search}</output>
    <button type="button" onClick={() => navigate(-1)}>Atrás de prueba</button>
    <button type="button" onClick={() => navigate(1)}>Adelante de prueba</button>
  </>;
}
const montar = (ruta = '/inventario') => render(<MemoryRouter initialEntries={[ruta]}>
  <Inventario /><NavegacionPrueba />
</MemoryRouter>);

describe('Inventario: página, hook y API paginada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filas = [...productos];
    api.get.mockImplementation(responder);
    mocks.crearLote.mockResolvedValue({});
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('abre una URL compartida y muestra las filas del servidor sin paginarlas otra vez', async () => {
    montar('/inventario?pagina=2&limite=10&activo=true');
    expect(await screen.findByRole('link', { name: 'Ver lotes de Producto 11' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver lotes de Producto 20' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver lotes de Producto 1' })).not.toBeInTheDocument();
    expect(screen.getByText('11–20 de 27 productos')).toBeInTheDocument();
    expect(peticionesListado()[0][1].params).toEqual({ pagina: 2, limite: 10, activo: 'true' });
  });

  it('conserva filtros al navegar y restaura página, tamaño y scroll con Atrás/Adelante', async () => {
    const usuario = userEvent.setup();
    montar('/inventario?limite=10&activo=true');
    await screen.findByRole('link', { name: 'Ver lotes de Producto 1' });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 320 });
    fireEvent.scroll(window);
    await usuario.click(screen.getByRole('link', { name: 'Siguiente' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 11' });
    expect(screen.getByLabelText('URL actual')).toHaveTextContent('activo=true');
    expect(screen.getByLabelText('URL actual')).toHaveTextContent('pagina=2');
    await usuario.click(screen.getByRole('button', { name: 'Atrás de prueba' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 1' });
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 320));
    await usuario.click(screen.getByRole('button', { name: 'Adelante de prueba' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 11' });
    expect(screen.getByRole('combobox', { name: 'Por página' })).toHaveValue('10');
    expect(api.get.mock.calls.filter(([url]) => url.endsWith('/resumen'))).toHaveLength(1);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('vuelve a página 1 al cambiar el tamaño o la búsqueda', async () => {
    const usuario = userEvent.setup();
    montar('/inventario?pagina=2&limite=10');
    await screen.findByRole('link', { name: 'Ver lotes de Producto 11' });
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Por página' }), '25');
    await screen.findByRole('link', { name: 'Ver lotes de Producto 1' });
    expect(screen.getByLabelText('URL actual')).not.toHaveTextContent('pagina=2');
    await usuario.click(screen.getByRole('link', { name: 'Siguiente' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 26' });
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar productos' }), 'Producto 2');
    expect(await screen.findByText('1–9 de 9 productos')).toBeInTheDocument();
    expect(peticionesListado().at(-1)[1].params).toEqual({ pagina: 1, limite: 25, busqueda: 'Producto 2' });
  });

  it('reemplaza una página fuera de rango por la efectiva sin quedar atrapado al volver', async () => {
    const usuario = userEvent.setup();
    montar('/inventario?pagina=99&limite=10');
    await screen.findByRole('link', { name: 'Ver lotes de Producto 21' });
    await waitFor(() => expect(screen.getByLabelText('URL actual')).toHaveTextContent('pagina=3'));
    await usuario.click(screen.getByRole('link', { name: 'Anterior' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 11' });
    await usuario.click(screen.getByRole('button', { name: 'Atrás de prueba' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 21' });
    expect(screen.getByLabelText('URL actual')).toHaveTextContent('pagina=3');
    expect(peticionesListado().filter(([, config]) => config.params.pagina === 99)).toHaveLength(1);
  });

  it('permite reintentar un fallo del listado y conserva el resumen disponible', async () => {
    let fallar = true;
    api.get.mockImplementation((url, config) => {
      if (!url.endsWith('/resumen') && fallar) return Promise.reject({ response: { data: { mensaje: 'Fallo de prueba' } } });
      return responder(url, config);
    });
    const usuario = userEvent.setup();
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo de prueba');
    expect(screen.getByRole('button', { name: /Productos/ })).toHaveTextContent('27');
    fallar = false;
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 1' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refresca después de ingresar un lote y recupera la página si cambió el total', async () => {
    const usuario = userEvent.setup();
    mocks.crearLote.mockImplementation(async () => { filas = filas.slice(0, 25); return {}; });
    montar('/inventario?pagina=2&limite=25');
    await screen.findByRole('link', { name: 'Ver lotes de Producto 26' });
    await usuario.click(screen.getByRole('button', { name: 'Ingresar lote' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar lote de prueba' }));
    await screen.findByRole('link', { name: 'Ver lotes de Producto 1' });
    await waitFor(() => expect(screen.getByLabelText('URL actual')).toHaveTextContent('pagina=1'));
    expect(screen.getByText('1–25 de 25 productos')).toBeInTheDocument();
    expect(api.get.mock.calls.filter(([url]) => url.endsWith('/resumen'))).toHaveLength(2);
  });
});

const render = (ui, options) => renderBase(ui, { wrapper: ToastProvider, ...options });
