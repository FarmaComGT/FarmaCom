jest.mock('../services/CasaEmailService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const CasaEmailService = require('../services/CasaEmailService');
const CasaEmailController = require('./CasaEmailController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('CasaEmailController', () => {
  describe('crear', () => {
    it('responde 201 con el correo creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      CasaEmailService.crearEmail.mockResolvedValue({ id_email: 1, correo: 'a@b.com' });

      const req = { params: { id_casa: '1' }, body: { correo: 'a@b.com' } };
      const res = mockResponse();

      await CasaEmailController.crear(req, res);

      expect(CasaEmailService.crearEmail).toHaveBeenCalledWith({ id_casa: 1, correo: 'a@b.com' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_email: 1, correo: 'a@b.com' });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'correo inválido' }] });

      const req = { params: { id_casa: '1' }, body: {} };
      const res = mockResponse();

      await CasaEmailController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CasaEmailService.crearEmail).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (404 casa inexistente)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('La casa farmacéutica no existe');
      error.status = 404;
      CasaEmailService.crearEmail.mockRejectedValue(error);

      const req = { params: { id_casa: '99' }, body: { correo: 'a@b.com' } };
      const res = mockResponse();

      await CasaEmailController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'La casa farmacéutica no existe' });
    });
  });

  describe('obtenerPorCasa', () => {
    it('responde 200 con los correos de la casa', async () => {
      CasaEmailService.obtenerPorCasa.mockResolvedValue([{ id_email: 1 }]);

      const req = { params: { id_casa: '1' } };
      const res = mockResponse();

      await CasaEmailController.obtenerPorCasa(req, res);

      expect(CasaEmailService.obtenerPorCasa).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_email: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrado"', async () => {
      const error = new Error('Correo no encontrado');
      error.status = 404;
      CasaEmailService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id_email: '99' } };
      const res = mockResponse();

      await CasaEmailController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Correo no encontrado' });
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el correo actualizado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      CasaEmailService.actualizarEmail.mockResolvedValue({ id_email: 1, correo: 'nuevo@b.com' });

      const req = { params: { id_email: '1' }, body: { correo: 'nuevo@b.com' } };
      const res = mockResponse();

      await CasaEmailController.actualizar(req, res);

      expect(CasaEmailService.actualizarEmail).toHaveBeenCalledWith(1, { correo: 'nuevo@b.com' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id_email: '1' }, body: {} };
      const res = mockResponse();

      await CasaEmailController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CasaEmailService.actualizarEmail).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      CasaEmailService.eliminarEmail.mockResolvedValue({ mensaje: 'Correo eliminado correctamente' });

      const req = { params: { id_email: '1' } };
      const res = mockResponse();

      await CasaEmailController.eliminar(req, res);

      expect(CasaEmailService.eliminarEmail).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Correo eliminado correctamente' });
    });
  });
});
