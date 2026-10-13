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
  describe('obtenerInventario', () => {
    it('responde 200 con el inventario de la sucursal', async () => {
      InventarioService.obtenerInventarioPorSucursal.mockResolvedValue([{ id_producto: 1 }]);

      const req = { params: { id_sucursal: '1' } };
      const res = mockResponse();

      await InventarioController.obtenerInventario(req, res);

      expect(InventarioService.obtenerInventarioPorSucursal).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_producto: 1 }]);
    });

    it('responde 404 cuando la sucursal no existe', async () => {
      const error = new Error('Sucursal no encontrada');
      error.status = 404;
      InventarioService.obtenerInventarioPorSucursal.mockRejectedValue(error);

      const req = { params: { id_sucursal: '99' } };
      const res = mockResponse();

      await InventarioController.obtenerInventario(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Sucursal no encontrada' });
    });
  });

  describe('obtenerResumen', () => {
    it('responde 200 con el resumen de inventario', async () => {
      InventarioService.obtenerResumenPorSucursal.mockResolvedValue({ total_productos: 5 });

      const req = { params: { id_sucursal: '1' } };
      const res = mockResponse();

      await InventarioController.obtenerResumen(req, res);

      expect(InventarioService.obtenerResumenPorSucursal).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ total_productos: 5 });
    });

    it('responde 404 cuando la sucursal no existe', async () => {
      const error = new Error('Sucursal no encontrada');
      error.status = 404;
      InventarioService.obtenerResumenPorSucursal.mockRejectedValue(error);

      const req = { params: { id_sucursal: '99' } };
      const res = mockResponse();

      await InventarioController.obtenerResumen(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
