jest.mock('../services/SucursalService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const sucursalService = require('../services/SucursalService');
const SucursalController = require('./SucursalController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('SucursalController', () => {
  describe('crear', () => {
    it('responde 201 con la sucursal creada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      sucursalService.crearSucursal.mockResolvedValue({ id_sucursal: 1, nombre_sucursal: 'Central' });

      const req = { body: { nombre_sucursal: 'Central' } };
      const res = mockResponse();

      await SucursalController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_sucursal: 1, nombre_sucursal: 'Central' });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await SucursalController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(sucursalService.crearSucursal).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 duplicado)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Ya existe una sucursal con ese nombre');
      error.status = 409;
      sucursalService.crearSucursal.mockRejectedValue(error);

      const req = { body: { nombre_sucursal: 'Central' } };
      const res = mockResponse();

      await SucursalController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerTodas', () => {
    it('responde 200 con la lista de sucursales', async () => {
      sucursalService.obtenerTodas.mockResolvedValue([{ id_sucursal: 1 }]);
      const res = mockResponse();

      await SucursalController.obtenerTodas({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_sucursal: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrada"', async () => {
      const error = new Error('Sucursal no encontrada');
      error.status = 404;
      sucursalService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await SucursalController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Sucursal no encontrada' });
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la sucursal actualizada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      sucursalService.actualizarSucursal.mockResolvedValue({ id_sucursal: 1, nombre_sucursal: 'Norte' });

      const req = { params: { id: '1' }, body: { nombre_sucursal: 'Norte' } };
      const res = mockResponse();

      await SucursalController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await SucursalController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(sucursalService.actualizarSucursal).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      sucursalService.eliminarSucursal.mockResolvedValue({ mensaje: 'Sucursal eliminada correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await SucursalController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Sucursal eliminada correctamente' });
    });
  });
});
