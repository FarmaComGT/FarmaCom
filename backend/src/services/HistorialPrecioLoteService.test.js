jest.mock('../daos/LoteDAO');
jest.mock('../daos/HistorialPrecioLoteDAO');

const LoteDAO = require('../daos/LoteDAO');
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
});
