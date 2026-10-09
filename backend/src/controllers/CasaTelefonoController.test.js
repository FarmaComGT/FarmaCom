jest.mock('../services/CasaTelefonoService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const CasaTelefonoService = require('../services/CasaTelefonoService');
const CasaTelefonoController = require('./CasaTelefonoController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('CasaTelefonoController', () => {
  describe('crear', () => {
    it('responde 201 con el teléfono creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      CasaTelefonoService.crearTelefono.mockResolvedValue({ id_telefono: 1, numero: '123' });

      const req = { params: { id_casa: '1' }, body: { numero: '123' } };
      const res = mockResponse();

      await CasaTelefonoController.crear(req, res);

      expect(CasaTelefonoService.crearTelefono).toHaveBeenCalledWith({ id_casa: 1, numero: '123' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_telefono: 1, numero: '123' });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id_casa: '1' }, body: {} };
      const res = mockResponse();

      await CasaTelefonoController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CasaTelefonoService.crearTelefono).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (404 casa inexistente)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('La casa farmacéutica no existe');
      error.status = 404;
      CasaTelefonoService.crearTelefono.mockRejectedValue(error);

      const req = { params: { id_casa: '99' }, body: { numero: '123' } };
      const res = mockResponse();

      await CasaTelefonoController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'La casa farmacéutica no existe' });
    });
  });

  describe('obtenerPorCasa', () => {
    it('responde 200 con los teléfonos de la casa', async () => {
      CasaTelefonoService.obtenerPorCasa.mockResolvedValue([{ id_telefono: 1 }]);

      const req = { params: { id_casa: '1' } };
      const res = mockResponse();

      await CasaTelefonoController.obtenerPorCasa(req, res);

      expect(CasaTelefonoService.obtenerPorCasa).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_telefono: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrado"', async () => {
      const error = new Error('Teléfono no encontrado');
      error.status = 404;
      CasaTelefonoService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id_telefono: '99' } };
      const res = mockResponse();

      await CasaTelefonoController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Teléfono no encontrado' });
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el teléfono actualizado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      CasaTelefonoService.actualizarTelefono.mockResolvedValue({ id_telefono: 1, numero: '456' });

      const req = { params: { id_telefono: '1' }, body: { numero: '456' } };
      const res = mockResponse();

      await CasaTelefonoController.actualizar(req, res);

      expect(CasaTelefonoService.actualizarTelefono).toHaveBeenCalledWith(1, { numero: '456' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id_telefono: '1' }, body: {} };
      const res = mockResponse();

      await CasaTelefonoController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CasaTelefonoService.actualizarTelefono).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      CasaTelefonoService.eliminarTelefono.mockResolvedValue({ mensaje: 'Teléfono eliminado correctamente' });

      const req = { params: { id_telefono: '1' } };
      const res = mockResponse();

      await CasaTelefonoController.eliminar(req, res);

      expect(CasaTelefonoService.eliminarTelefono).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Teléfono eliminado correctamente' });
    });
  });
});
