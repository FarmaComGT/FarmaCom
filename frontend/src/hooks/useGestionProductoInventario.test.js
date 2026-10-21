import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useGestionProductoInventario from './useGestionProductoInventario.js';

const formulario = {
  codigo: 'MED010-TA',
  nombre_comercial: 'Paracetamol',
  nombre_generico: 'Acetaminofén',
  concentracion: null,
  id_presentacion: 2,
  id_categoria: 3,
  id_casa: 4,
  id_proveedor: undefined,
  precio_compra: 12.5,
  stock_minimo: 5,
  meses_alerta_vencimiento: 6,
  aplica_mayoreo: false,
};

const crearPropiedades = () => ({
  crearProducto: vi.fn().mockResolvedValue({}),
  actualizarProducto: vi.fn().mockResolvedValue({}),
  cambiarEstado: vi.fn().mockResolvedValue({}),
  refrescarInventario: vi.fn().mockResolvedValue(undefined),
  onExito: vi.fn(),
});

describe('useGestionProductoInventario', () => {
  it('crea un producto con el payload recibido y refresca el inventario', async () => {
    const propiedades = crearPropiedades();
    const { result } = renderHook(() => useGestionProductoInventario(propiedades));

    act(() => result.current.abrirNuevo());
    await act(() => result.current.guardar(formulario));

    expect(propiedades.crearProducto).toHaveBeenCalledWith({
      codigo: 'MED010-TA',
      nombre_comercial: 'Paracetamol',
      nombre_generico: 'Acetaminofén',
      concentracion: null,
      id_presentacion: 2,
      id_categoria: 3,
      id_casa: 4,
      id_proveedor: undefined,
      precio_compra: 12.5,
      stock_minimo: 5,
      meses_alerta_vencimiento: 6,
      aplica_mayoreo: false,
    });
    expect(propiedades.refrescarInventario).toHaveBeenCalledOnce();
    expect(propiedades.onExito).toHaveBeenCalledWith(
      'Producto Paracetamol creado correctamente.',
    );
    expect(result.current.mostrarFormulario).toBe(false);
  });

  it('actualiza el producto seleccionado con el payload recibido', async () => {
    const propiedades = crearPropiedades();
    const { result } = renderHook(() => useGestionProductoInventario(propiedades));

    act(() => result.current.abrirEdicion({ id_producto: 8, codigo: 'MED008-JA' }));
    await act(() => result.current.guardar({ ...formulario, codigo: 'MED008-JA' }));

    expect(propiedades.actualizarProducto).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ codigo: 'MED008-JA' }),
    );
    await waitFor(() => expect(result.current.productoEditando).toBeNull());
  });
});
