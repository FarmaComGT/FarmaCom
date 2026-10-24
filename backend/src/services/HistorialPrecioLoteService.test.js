jest.mock('../daos/LoteDAO');
jest.mock('../daos/ProductoDAO');
jest.mock('../daos/HistorialPrecioLoteDAO');

const LoteDAO = require('../daos/LoteDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');
const HistorialPrecioLoteService = require('./HistorialPrecioLoteService');

describe('HistorialPrecioLoteService', () => {
  it('devuelve el historial de un lote existente', async () => {
    const historial = [{ id_historial_precio: 1, tipo_precio: 'venta' }];
    LoteDAO.obtenerPorId.mockResolvedValue({ id_lote: 7 });
    HistorialPrecioLoteDAO.obtenerPorLote.mockResolvedValue(historial);

    await expect(HistorialPrecioLoteService.obtenerPorLote(7)).resolves.toEqual(historial);
  });

  it('devuelve 404 si el lote no existe', async () => {
    LoteDAO.obtenerPorId.mockResolvedValue(null);

    await expect(HistorialPrecioLoteService.obtenerPorLote(99)).rejects.toMatchObject({
      message: 'Lote no encontrado',
      status: 404,
    });
    expect(HistorialPrecioLoteDAO.obtenerPorLote).not.toHaveBeenCalled();
  });

  it('devuelve el historial de ingresos de un producto existente', async () => {
    const historial = [{ id_historial_precio: 2, numero_lote: 'LT-02' }];
    ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 5 });
    HistorialPrecioLoteDAO.obtenerPorProducto.mockResolvedValue(historial);

    await expect(
      HistorialPrecioLoteService.obtenerPorProducto(5),
    ).resolves.toEqual(historial);

    expect(HistorialPrecioLoteDAO.obtenerPorProducto).toHaveBeenCalledWith(5);
  });

  it('devuelve 404 si el producto del historial no existe', async () => {
    ProductoDAO.obtenerPorId.mockResolvedValue(null);

    await expect(
      HistorialPrecioLoteService.obtenerPorProducto(99),
    ).rejects.toMatchObject({
      message: 'Producto no encontrado',
      status: 404,
    });
    expect(HistorialPrecioLoteDAO.obtenerPorProducto).not.toHaveBeenCalled();
  });
});
