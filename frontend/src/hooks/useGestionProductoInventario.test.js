import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useGestionProductoInventario from './useGestionProductoInventario.js';

const formulario = {
  nombre_comercial: ' Paracetamol ',
  nombre_generico: ' Acetaminofén ',
  concentracion: '',
  id_presentacion: '2',
  id_categoria: '3',
  id_casa: '4',
  id_proveedor: '',
  precio_compra: '12.50',
  stock_minimo: '5',
  meses_alerta_vencimiento: '6',
  aplica_mayoreo: false,
};

const crearPropiedades = () => ({
  presentaciones: [{ id_presentacion: 2, nombre: 'Tableta' }],
  codigoSugerido: 'MED010',
  crearProducto: vi.fn().mockResolvedValue({}),
  actualizarProducto: vi.fn().mockResolvedValue({}),
  cambiarEstado: vi.fn().mockResolvedValue({}),
  refrescarInventario: vi.fn().mockResolvedValue(undefined),
  onExito: vi.fn(),
});

describe('useGestionProductoInventario', () => {
  it('crea un producto, normaliza el formulario y refresca el inventario', async () => {
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

  it('conserva el código al editar un producto', async () => {
    const propiedades = crearPropiedades();
    const { result } = renderHook(() => useGestionProductoInventario(propiedades));

    act(() => result.current.abrirEdicion({ id_producto: 8, codigo: 'MED008-JA' }));
    await act(() => result.current.guardar(formulario));

    expect(propiedades.actualizarProducto).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ codigo: 'MED008-JA' }),
    );
    await waitFor(() => expect(result.current.productoEditando).toBeNull());
  });
});
