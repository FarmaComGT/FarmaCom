jest.mock('../services/LoteService');

const LoteService = require('../services/LoteService');
const LoteController = require('./LoteController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('LoteController', () => {
  it('crea un lote', async () => {
    LoteService.crearLote.mockResolvedValue({ id_lote: 1 });
    const body = { numero_lote: 'L-001' };
    const res = mockResponse();

    await LoteController.crear({ body }, res, jest.fn());

    expect(LoteService.crearLote).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('lista lotes por sucursal y producto', async () => {
    LoteService.obtenerPorSucursal.mockResolvedValue([]);
    LoteService.obtenerPorProducto.mockResolvedValue([]);
    const res = mockResponse();

    await LoteController.obtenerPorSucursal({ params: { id_sucursal: '3' } }, res, jest.fn());
    await LoteController.obtenerPorProducto({ params: { id_producto: '4' } }, res, jest.fn());

    expect(LoteService.obtenerPorSucursal).toHaveBeenCalledWith(3);
    expect(LoteService.obtenerPorProducto).toHaveBeenCalledWith(4);
  });

  it('obtiene y elimina un lote por id', async () => {
    LoteService.obtenerPorId.mockResolvedValue({ id_lote: 7 });
    LoteService.eliminarLote.mockResolvedValue({ mensaje: 'Lote eliminado correctamente' });
    const res = mockResponse();

    await LoteController.obtenerPorId({ params: { id: '7' } }, res, jest.fn());
    await LoteController.eliminar({ params: { id: '7' } }, res, jest.fn());

    expect(LoteService.obtenerPorId).toHaveBeenCalledWith(7);
    expect(LoteService.eliminarLote).toHaveBeenCalledWith(7);
  });

  it('actualiza con el usuario autenticado', async () => {
    LoteService.actualizarLote.mockResolvedValue({ id_lote: 7 });
    const req = {
      params: { id: '7' },
      body: { precio_venta: 20 },
      usuario: { id_usuario: 9 },
    };
    const res = mockResponse();

    await LoteController.actualizar(req, res, jest.fn());

    expect(LoteService.actualizarLote).toHaveBeenCalledWith(7, { precio_venta: 20 }, 9);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it.each([
    [{}, null],
    [{ id_sucursal: '3' }, 3],
  ])('consulta alertas con params %p', async (params, idSucursal) => {
    LoteService.obtenerAlertas.mockResolvedValue([]);
    const res = mockResponse();

    await LoteController.obtenerAlertas({ params }, res, jest.fn());

    expect(LoteService.obtenerAlertas).toHaveBeenCalledWith(idSucursal);
  });

  it('delega errores del servicio al middleware', async () => {
    const error = new Error('fallo inesperado');
    LoteService.obtenerPorId.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await LoteController.obtenerPorId({ params: { id: '7' } }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
