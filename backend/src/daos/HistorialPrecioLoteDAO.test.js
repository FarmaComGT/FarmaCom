jest.mock('../database/db');

const pool = require('../database/db');
const HistorialPrecioLoteDAO = require('./HistorialPrecioLoteDAO');

describe('HistorialPrecioLoteDAO', () => {
  describe('registrarPorIngreso', () => {
    it('registra compra y venta como valores iniciales para el primer lote', async () => {
      const client = { query: jest.fn() };
      client.query
        .mockResolvedValueOnce({ rows: [{ tipo_precio: 'compra' }] })
        .mockResolvedValueOnce({ rows: [{ tipo_precio: 'venta' }] });

      const resultado = await HistorialPrecioLoteDAO.registrarPorIngreso(
        null,
        { id_lote: 7, precio_compra: '10', precio_venta: '15.5' },
        9,
        client,
      );

      expect(client.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("'ingreso_lote'"),
        [7, 'compra', null, '10.00', 9],
      );
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("'ingreso_lote'"),
        [7, 'venta', null, '15.50', 9],
      );
      expect(resultado).toHaveLength(2);
    });

    it('registra solamente el tipo de precio que cambió', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [{ tipo_precio: 'venta' }] }),
      };

      const resultado = await HistorialPrecioLoteDAO.registrarPorIngreso(
        { precio_compra: '10.00', precio_venta: '15.00' },
        { id_lote: 8, precio_compra: 10, precio_venta: 16 },
        9,
        client,
      );

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(
        expect.any(String),
        [8, 'venta', '15.00', '16.00', 9],
      );
      expect(resultado).toEqual([{ tipo_precio: 'venta' }]);
    });

    it('omite precios monetariamente equivalentes', async () => {
      const client = { query: jest.fn() };

      const resultado = await HistorialPrecioLoteDAO.registrarPorIngreso(
        { precio_compra: '10.0', precio_venta: '15.00' },
        { id_lote: 8, precio_compra: 10, precio_venta: '15' },
        9,
        client,
      );

      expect(client.query).not.toHaveBeenCalled();
      expect(resultado).toEqual([]);
    });

    it('rechaza un precio nuevo sin valor numérico', async () => {
      const client = { query: jest.fn() };

      await expect(HistorialPrecioLoteDAO.registrarPorIngreso(
        null,
        { id_lote: 8, precio_compra: null, precio_venta: 15 },
        9,
        client,
      )).rejects.toThrow('El precio debe tener un valor numérico');

      expect(client.query).not.toHaveBeenCalled();
    });
  });

  it('consulta el historial más reciente del lote', async () => {
    const filas = [{ id_historial_precio: 3, id_lote: 7 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(HistorialPrecioLoteDAO.obtenerPorLote(7)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [7]);
  });

  it('consulta por producto solamente los precios originados por ingresos', async () => {
    const filas = [{
      id_historial_precio: 4,
      id_lote: 8,
      numero_lote: 'LT-08',
      nombre_sucursal: 'Central',
    }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(
      HistorialPrecioLoteDAO.obtenerPorProducto(2),
    ).resolves.toEqual(filas);

    const [consulta, valores] = pool.query.mock.calls[0];
    expect(consulta).toContain('JOIN lote l ON l.id_lote = h.id_lote');
    expect(consulta).toContain('JOIN sucursal s ON s.id_sucursal = l.id_sucursal');
    expect(consulta).toContain("AND h.origen = 'ingreso_lote'");
    expect(consulta).toContain('ORDER BY h.fecha_cambio DESC');
    expect(valores).toEqual([2]);
  });
});
