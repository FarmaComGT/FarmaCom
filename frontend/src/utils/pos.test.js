import { describe, expect, it } from 'vitest';
import {
  agruparLotesPorProductoPOS,
  construirCatalogoPOS,
  crearItemLotePOS,
  filtrarCatalogoPOS,
} from './pos';

const inventario = [
  {
    id_producto: 1,
    codigo: 'MED-001',
    nombre_comercial: 'Paracetamol',
    nombre_generico: 'Acetaminofén',
    activo: true,
  },
  {
    id_producto: 2,
    codigo: 'MED-002',
    nombre_comercial: 'Ibuprofeno',
    activo: false,
  },
];

describe('utilidades del punto de venta', () => {
  it('construye opciones vendibles y excluye lotes vencidos o sin stock', () => {
    const lotes = [
      {
        id_lote: 10,
        id_producto: 1,
        presentacion: 'Blíster',
        stock_actual: 40,
        precio_venta: '8.50',
        numero_lote: 'L-001',
        estado_vencimiento: 'normal',
        estado_stock: 'normal',
      },
      {
        id_lote: 11,
        id_producto: 1,
        presentacion: 'Caja',
        stock_actual: 0,
        precio_venta: '75.00',
        estado_vencimiento: 'normal',
      },
      {
        id_lote: 12,
        id_producto: 2,
        presentacion: 'Unidad',
        stock_actual: 20,
        precio_venta: '2.00',
        estado_vencimiento: 'normal',
      },
    ];

    const resultado = construirCatalogoPOS(inventario, lotes);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      nombre_comercial: 'Paracetamol',
      presentacion: 'Blíster',
      stock_disponible: 40,
      precio_minimo: 8.5,
      precio_maximo: 8.5,
      tiene_precio: true,
      lotes: [expect.objectContaining({ id_lote: 10, precio_venta: 8.5 })],
    });
  });

  it('no interpreta un precio nulo como un precio de cero', () => {
    const resultado = construirCatalogoPOS(inventario, [
      {
        id_lote: 10,
        id_producto: 1,
        presentacion: 'Blíster',
        stock_actual: 5,
        precio_venta: null,
        estado_vencimiento: 'normal',
      },
    ]);

    expect(resultado[0].precio_minimo).toBeNull();
    expect(resultado[0].tiene_precio).toBe(false);
  });

  it('conserva todos los lotes y calcula el rango de precios vendibles', () => {
    const resultado = construirCatalogoPOS(inventario, [
      {
        id_lote: 10,
        id_producto: 1,
        stock_actual: 5,
        precio_venta: '0.00',
        estado_vencimiento: 'normal',
      },
      {
        id_lote: 11,
        id_producto: 1,
        stock_actual: 5,
        precio_venta: '1.25',
        estado_vencimiento: 'normal',
      },
    ]);

    expect(resultado[0]).toMatchObject({
      cantidad_lotes: 2,
      precio_minimo: 1.25,
      precio_maximo: 1.25,
      tiene_precio: true,
    });
    expect(resultado[0].lotes).toHaveLength(2);
  });

  it('agrupa los lotes por producto, acumula existencias y los ordena por número', () => {
    const resultado = agruparLotesPorProductoPOS([
      {
        id_producto: 1,
        id_lote: 13,
        nombre_comercial: 'Paracetamol',
        numero_lote: 'L-003',
        fecha_vencimiento: null,
        stock_disponible: '4',
        precio_venta: '8.50',
        estado_vencimiento: 'normal',
      },
      {
        id_producto: 1,
        id_lote: 12,
        nombre_comercial: 'Paracetamol',
        numero_lote: 'L-002',
        fecha_vencimiento: '2027-06-01',
        stock_disponible: '6',
        precio_venta: '8.50',
        estado_vencimiento: 'normal',
      },
      {
        id_producto: 1,
        id_lote: 11,
        nombre_comercial: 'Paracetamol',
        numero_lote: 'L-001',
        fecha_vencimiento: '2027-02-01',
        stock_disponible: '5',
        precio_venta: '8.50',
        estado_vencimiento: 'normal',
      },
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id_producto: 1,
      cantidad_lotes: 3,
      stock_disponible: 15,
      precio_minimo: 8.5,
      precio_maximo: 8.5,
    });
    expect(resultado[0].lotes.map(({ id_lote }) => id_lote)).toEqual([11, 12, 13]);
  });

  it('crea un artículo de carrito exclusivamente para el lote elegido', () => {
    const producto = {
      id_producto: 1,
      nombre_comercial: 'Paracetamol',
      cantidad_lotes: 2,
      stock_disponible: 14,
      lotes: [
        { id_lote: 3, numero_lote: 'L-003', stock_disponible: 10, precio_venta: 8, tiene_precio: true },
        { id_lote: 2, numero_lote: 'L-002', stock_disponible: 4, precio_venta: 9, tiene_precio: true },
      ],
    };

    expect(crearItemLotePOS(producto, producto.lotes[1])).toMatchObject({
      id_producto: 1,
      id_lote: 2,
      carritoKey: 'lote-2',
      numero_lote: 'L-002',
      stock_disponible: 4,
      precio_venta: 9,
    });
    expect(crearItemLotePOS(producto, producto.lotes[1])).not.toHaveProperty('lotes');
  });

  it('filtra por código, nombre genérico o presentación', () => {
    const productos = [
      {
        codigo: 'MED-001',
        nombre_comercial: 'Paracetamol',
        nombre_generico: 'Acetaminofén',
        presentacion: 'Blíster',
      },
      {
        codigo: 'HIG-010',
        nombre_comercial: 'Pañales',
        presentacion: 'Paquete',
      },
    ];

    expect(filtrarCatalogoPOS(productos, 'MED-001')).toEqual([productos[0]]);
    expect(filtrarCatalogoPOS(productos, 'acetaminofén')).toEqual([productos[0]]);
    expect(filtrarCatalogoPOS(productos, 'paquete')).toEqual([productos[1]]);
  });
});
