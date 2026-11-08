import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { buscarProductoPorLectura } from './lecturaProductos';

vi.mock('./axios', () => ({ default: { get: vi.fn() } }));

const fila = {
  id_producto: 7, codigo: 'MED-7', codigo_barras: '000123', id_lote: 9,
  numero_lote: 'L-9', stock_disponible: 5, precio_venta: '12.50',
  estado_vencimiento: 'normal', id_promocion: 2,
  promocion_cantidad_minima: '3', precio_promocion: '10.00',
};

describe('buscarProductoPorLectura', () => {
  beforeEach(() => vi.resetAllMocks());

  it('conserva código y promociones y agrupa todos los lotes sin buscar por aproximación', async () => {
    api.get.mockResolvedValue({ data: [fila, { ...fila, id_lote: 10, numero_lote: 'L-10' }] });
    const producto = await buscarProductoPorLectura('000123');
    expect(api.get).toHaveBeenCalledWith('/productos/lectura', { params: { codigo: '000123' }, signal: undefined });
    expect(producto).toMatchObject({
      id_producto: 7, codigo_barras: '000123', cantidad_lotes: 2,
      tiene_precio: true, promocion: { id_promocion: 2, cantidad_minima: 3, precio_promocion: 10 },
    });
  });

  it.each([
    { filas: [] },
    { filas: [fila, { ...fila, id_producto: 8, id_lote: 11 }] },
    { filas: [{ ...fila, stock_disponible: 0 }] },
  ])('rechaza respuestas vacías o ambiguas sin elegir un primer resultado', async ({ filas }) => {
    api.get.mockResolvedValue({ data: filas });
    await expect(buscarProductoPorLectura('000123')).rejects.toThrow('único producto vendible');
  });
});
