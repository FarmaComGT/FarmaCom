jest.mock('../services/CasaFarmaceuticaService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const CasaFarmaceuticaService = require('../services/CasaFarmaceuticaService');
const CasaFarmaceuticaController = require('./CasaFarmaceuticaController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('CasaFarmaceuticaController', () => {
  describe('crear', () => {
    it('responde 201 con la casa creada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      CasaFarmaceuticaService.crearCasa.mockResolvedValue({ id_casa: 1, nombre: 'Bayer' });

      const req = { body: { nombre: 'Bayer' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_casa: 1, nombre: 'Bayer' });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await CasaFarmaceuticaController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CasaFarmaceuticaService.crearCasa).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 duplicado)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Ya existe una casa farmacéutica con ese nombre');
      error.status = 409;
      CasaFarmaceuticaService.crearCasa.mockRejectedValue(error);

      const req = { body: { nombre: 'Bayer' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerTodas', () => {
    it('responde 200 con la lista de casas', async () => {
      CasaFarmaceuticaService.obtenerTodas.mockResolvedValue([{ id_casa: 1 }]);

      const res = mockResponse();

      await CasaFarmaceuticaController.obtenerTodas({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_casa: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrada"', async () => {
      const error = new Error('Casa farmacéutica no encontrada');
      error.status = 404;
      CasaFarmaceuticaService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Casa farmacéutica no encontrada' });
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la casa actualizada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      CasaFarmaceuticaService.actualizarCasa.mockResolvedValue({ id_casa: 1, nombre: 'Bayer S.A.' });

      const req = { params: { id: '1' }, body: { nombre: 'Bayer S.A.' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await CasaFarmaceuticaController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CasaFarmaceuticaService.actualizarCasa).not.toHaveBeenCalled();
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 cuando "activo" es un booleano válido', async () => {
      CasaFarmaceuticaService.cambiarEstado.mockResolvedValue({ id_casa: 1, activo: false });

      const req = { params: { id: '1' }, body: { activo: false } };
      const res = mockResponse();

      await CasaFarmaceuticaController.cambiarEstado(req, res);

      expect(CasaFarmaceuticaService.cambiarEstado).toHaveBeenCalledWith(1, false);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando "activo" no es un booleano', async () => {
      const req = { params: { id: '1' }, body: { activo: 'si' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.cambiarEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(CasaFarmaceuticaService.cambiarEstado).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      CasaFarmaceuticaService.eliminarCasa.mockResolvedValue({ mensaje: 'Casa farmacéutica eliminada correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerProveedoresVinculados', () => {
    it('responde 200 con los proveedores vinculados', async () => {
      CasaFarmaceuticaService.obtenerProveedoresVinculados.mockResolvedValue([{ id_proveedor: 1 }]);

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.obtenerProveedoresVinculados(req, res);

      expect(CasaFarmaceuticaService.obtenerProveedoresVinculados).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_proveedor: 1 }]);
    });

    it('responde 404 cuando la casa no existe', async () => {
      const error = new Error('Casa farmacéutica no encontrada');
      error.status = 404;
      CasaFarmaceuticaService.obtenerProveedoresVinculados.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.obtenerProveedoresVinculados(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
