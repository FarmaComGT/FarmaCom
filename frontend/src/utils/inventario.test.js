import { describe, expect, it } from 'vitest';
import { filtrarProductosInventario, siguienteCodigoProducto } from './inventario.js';

const productos = [
  {
    id_producto: 1,
    codigo: 'MED001-TAB',
    nombre_comercial: 'Analgésico Forte',
    nombre_generico: 'Paracetamol',
    id_categoria: 2,
    estado_stock: 'poco_stock',
    estado_vencimiento: 'proximo_a_vencer',
    activo: true,
  },
  {
    id_producto: 2,
    codigo: 'MED008-JAR',
    nombre_comercial: 'Jarabe infantil',
    nombre_generico: 'Loratadina',
    id_categoria: 4,
    estado_stock: 'normal',
    estado_vencimiento: 'normal',
    activo: false,
  },
];

describe('filtrarProductosInventario', () => {
  it('combina de forma independiente los estados de stock y vencimiento', () => {
    const resultado = filtrarProductosInventario(productos, '', {
      id_categoria: '',
      estado_stock: 'poco_stock',
      estado_vencimiento: 'proximo_a_vencer',
      activo: '',
    });

    expect(resultado).toEqual([productos[0]]);
  });

  it('filtra por búsqueda, categoría y estado del catálogo', () => {
    const resultado = filtrarProductosInventario(productos, 'jarabe', {
      id_categoria: '4',
      estado_stock: '',
      estado_vencimiento: '',
      activo: 'false',
    });

    expect(resultado).toEqual([productos[1]]);
  });
});

describe('siguienteCodigoProducto', () => {
  it('calcula el siguiente correlativo sin depender del sufijo de presentación', () => {
    expect(siguienteCodigoProducto(productos)).toBe('MED009');
  });
});
