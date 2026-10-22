jest.mock('../services/InventarioService');

const InventarioService = require('../services/InventarioService');
const InventarioController = require('./InventarioController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('InventarioController', () => {
  it('devuelve el inventario de la sucursal', async () => {
    InventarioService.obtenerInventarioPorSucursal.mockResolvedValue([{ id_producto: 1 }]);
    const res = mockResponse();

    await InventarioController.obtenerInventario({ params: { id_sucursal: '2' } }, res, jest.fn());

    expect(InventarioService.obtenerInventarioPorSucursal).toHaveBeenCalledWith(2);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('devuelve el resumen de la sucursal', async () => {
    InventarioService.obtenerResumenPorSucursal.mockResolvedValue({ total: 3 });
    const res = mockResponse();

    await InventarioController.obtenerResumen({ params: { id_sucursal: '2' } }, res, jest.fn());

    expect(InventarioService.obtenerResumenPorSucursal).toHaveBeenCalledWith(2);
    expect(res.json).toHaveBeenCalledWith({ total: 3 });
  });

  it('delega al middleware los errores del servicio', async () => {
    const error = new Error('fallo de base de datos');
    InventarioService.obtenerInventarioPorSucursal.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await InventarioController.obtenerInventario({ params: { id_sucursal: '2' } }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
