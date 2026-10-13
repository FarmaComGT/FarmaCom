jest.mock('../services/LoteService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const LoteService = require('../services/LoteService');
const LoteController = require('./LoteController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('LoteController', () => {
  describe('crear', () => {
    it('responde 201 con el lote creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      LoteService.crearLote.mockResolvedValue({ id_lote: 1 });

      const req = { body: { numero_lote: 'L-001' } };
      const res = mockResponse();

      await LoteController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await LoteController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(LoteService.crearLote).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 duplicado)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Ya existe un lote con ese número');
      error.status = 409;
      LoteService.crearLote.mockRejectedValue(error);

      const req = { body: {} };
      const res = mockResponse();

      await LoteController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerPorSucursal', () => {
    it('responde 200 con los lotes de la sucursal', async () => {
      LoteService.obtenerPorSucursal.mockResolvedValue([{ id_lote: 1 }]);

      const req = { params: { id_sucursal: '1' } };
      const res = mockResponse();

      await LoteController.obtenerPorSucursal(req, res);

      expect(LoteService.obtenerPorSucursal).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorProducto', () => {
    it('responde 404 cuando el producto no existe', async () => {
      const error = new Error('Producto no encontrado');
      error.status = 404;
      LoteService.obtenerPorProducto.mockRejectedValue(error);

      const req = { params: { id_producto: '99' } };
      const res = mockResponse();

      await LoteController.obtenerPorProducto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando no existe', async () => {
      const error = new Error('Lote no encontrado');
      error.status = 404;
      LoteService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await LoteController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('actualizar', () => {
    it('responde 200 pasando el id del usuario autenticado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      LoteService.actualizarLote.mockResolvedValue({ id_lote: 1 });

      const req = { params: { id: '1' }, body: { numero_lote: 'L-002' }, usuario: { id_usuario: 7 } };
      const res = mockResponse();

      await LoteController.actualizar(req, res);

      expect(LoteService.actualizarLote).toHaveBeenCalledWith(1, { numero_lote: 'L-002' }, 7);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {}, usuario: { id_usuario: 7 } };
      const res = mockResponse();

      await LoteController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(LoteService.actualizarLote).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      LoteService.eliminarLote.mockResolvedValue({ mensaje: 'Lote eliminado correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await LoteController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await LoteController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(LoteService.eliminarLote).not.toHaveBeenCalled();
    });

    it('responde 409 cuando el lote está asociado a ventas', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('No se puede eliminar un lote asociado a ventas');
      error.status = 409;
      LoteService.eliminarLote.mockRejectedValue(error);

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await LoteController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerAlertas', () => {
    it('responde 200 con alertas globales cuando no hay id_sucursal', async () => {
      LoteService.obtenerAlertas.mockResolvedValue([{ id_lote: 1 }]);

      const req = { params: {} };
      const res = mockResponse();

      await LoteController.obtenerAlertas(req, res);

      expect(LoteService.obtenerAlertas).toHaveBeenCalledWith(null);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 200 con alertas filtradas por sucursal', async () => {
      LoteService.obtenerAlertas.mockResolvedValue([{ id_lote: 1 }]);

      const req = { params: { id_sucursal: '3' } };
      const res = mockResponse();

      await LoteController.obtenerAlertas(req, res);

      expect(LoteService.obtenerAlertas).toHaveBeenCalledWith(3);
    });
  });
});
