jest.mock('../services/HistorialPrecioLoteService');

const HistorialPrecioLoteService = require('../services/HistorialPrecioLoteService');
const HistorialPrecioLoteController = require('./HistorialPrecioLoteController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('HistorialPrecioLoteController', () => {
  it('obtiene el historial por lote', async () => {
    const historial = [{ id_historial_precio: 1 }];
    HistorialPrecioLoteService.obtenerPorLote.mockResolvedValue(historial);
    const res = mockResponse();

    await HistorialPrecioLoteController.obtenerPorLote(
      { params: { id: '7' } },
      res,
      jest.fn(),
    );

    expect(HistorialPrecioLoteService.obtenerPorLote).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(historial);
  });

  it('obtiene el historial por producto', async () => {
    const historial = [{ id_historial_precio: 2 }];
    HistorialPrecioLoteService.obtenerPorProducto.mockResolvedValue(historial);
    const res = mockResponse();

    await HistorialPrecioLoteController.obtenerPorProducto(
      { params: { id: '5' } },
      res,
      jest.fn(),
    );

    expect(HistorialPrecioLoteService.obtenerPorProducto).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(historial);
  });
});
