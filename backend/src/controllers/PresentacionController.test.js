jest.mock('../services/PresentacionService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const PresentacionService = require('../services/PresentacionService');
const PresentacionController = require('./PresentacionController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('PresentacionController', () => {
  describe('crear', () => {
    it('responde 201 con la presentación creada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      PresentacionService.crearPresentacion.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });

      const req = { body: { nombre: 'Caja' } };
      const res = mockResponse();

      await PresentacionController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_presentacion: 1, nombre: 'Caja' });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await PresentacionController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(PresentacionService.crearPresentacion).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 duplicado)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Ya existe una presentación con ese nombre');
      error.status = 409;
      PresentacionService.crearPresentacion.mockRejectedValue(error);

      const req = { body: { nombre: 'Caja' } };
      const res = mockResponse();

      await PresentacionController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerTodas', () => {
    it('responde 200 con la lista de presentaciones', async () => {
      PresentacionService.obtenerTodas.mockResolvedValue([{ id_presentacion: 1 }]);
      const res = mockResponse();

      await PresentacionController.obtenerTodas({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_presentacion: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 200 con la presentación', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      PresentacionService.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await PresentacionController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando el id no es válido', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: 'abc' } };
      const res = mockResponse();

      await PresentacionController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(PresentacionService.obtenerPorId).not.toHaveBeenCalled();
    });

    it('responde 404 cuando no existe', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Presentación no encontrada');
      error.status = 404;
      PresentacionService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await PresentacionController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la presentación actualizada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      PresentacionService.actualizarPresentacion.mockResolvedValue({ id_presentacion: 1, nombre: 'Frasco' });

      const req = { params: { id: '1' }, body: { nombre: 'Frasco' } };
      const res = mockResponse();

      await PresentacionController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await PresentacionController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(PresentacionService.actualizarPresentacion).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      PresentacionService.eliminarPresentacion.mockResolvedValue({ mensaje: 'Presentación eliminada correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await PresentacionController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 409 cuando está asociada a productos', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('No se puede eliminar una presentación asociada a productos');
      error.status = 409;
      PresentacionService.eliminarPresentacion.mockRejectedValue(error);

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await PresentacionController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });
});
