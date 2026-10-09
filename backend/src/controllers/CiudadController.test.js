jest.mock('../services/CiudadService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const ciudadService = require('../services/CiudadService');
const CiudadController = require('./CiudadController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('CiudadController', () => {
  describe('crear', () => {
    it('responde 201 con la ciudad creada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ciudadService.crearCiudad.mockResolvedValue({ id_ciudad: 1, nombre_ciudad: 'Guatemala' });

      const req = { body: { nombre_ciudad: 'Guatemala' } };
      const res = mockResponse();

      await CiudadController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_ciudad: 1, nombre_ciudad: 'Guatemala' });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await CiudadController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ciudadService.crearCiudad).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 duplicado)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Ya existe una ciudad con ese nombre');
      error.status = 409;
      ciudadService.crearCiudad.mockRejectedValue(error);

      const req = { body: { nombre_ciudad: 'Guatemala' } };
      const res = mockResponse();

      await CiudadController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerTodas', () => {
    it('responde 200 con la lista de ciudades', async () => {
      ciudadService.obtenerTodas.mockResolvedValue([{ id_ciudad: 1 }]);
      const res = mockResponse();

      await CiudadController.obtenerTodas({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_ciudad: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrada"', async () => {
      const error = new Error('Ciudad no encontrada');
      error.status = 404;
      ciudadService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await CiudadController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Ciudad no encontrada' });
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la ciudad actualizada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ciudadService.actualizarCiudad.mockResolvedValue({ id_ciudad: 1, nombre_ciudad: 'Antigua' });

      const req = { params: { id: '1' }, body: { nombre_ciudad: 'Antigua' } };
      const res = mockResponse();

      await CiudadController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await CiudadController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ciudadService.actualizarCiudad).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      ciudadService.eliminarCiudad.mockResolvedValue({ mensaje: 'Ciudad eliminada correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await CiudadController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 409 cuando la ciudad está asociada a sucursales', async () => {
      const error = new Error('No se puede eliminar una ciudad asociada a sucursales');
      error.status = 409;
      ciudadService.eliminarCiudad.mockRejectedValue(error);

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await CiudadController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });
});
