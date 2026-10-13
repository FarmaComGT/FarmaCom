jest.mock('../services/CiudadService');

const ciudadService = require('../services/CiudadService');
const CiudadController = require('./CiudadController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CiudadController', () => {
  describe('crear', () => {
    it('responde 201 con la ciudad creada', async () => {
      ciudadService.crearCiudad.mockResolvedValue({ id_ciudad: 1, nombre_ciudad: 'Guatemala' });

      const req = { body: { nombre_ciudad: 'Guatemala' } };
      const res = mockResponse();

      await CiudadController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_ciudad: 1, nombre_ciudad: 'Guatemala' });
    });

    it('envía al middleware el error del service (409 duplicado)', async () => {
      const error = new Error('Ya existe una ciudad con ese nombre');
      error.status = 409;
      ciudadService.crearCiudad.mockRejectedValue(error);

      const req = { body: { nombre_ciudad: 'Guatemala' } };
      const res = mockResponse();
      const next = jest.fn();

      await CiudadController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
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
    it('envía al middleware el error cuando la ciudad no existe', async () => {
      const error = new Error('Ciudad no encontrada');
      error.status = 404;
      ciudadService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await CiudadController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la ciudad actualizada', async () => {
      ciudadService.actualizarCiudad.mockResolvedValue({ id_ciudad: 1, nombre_ciudad: 'Antigua' });

      const req = { params: { id: '1' }, body: { nombre_ciudad: 'Antigua' } };
      const res = mockResponse();

      await CiudadController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
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

    it('envía al middleware el error cuando la ciudad está asociada a sucursales', async () => {
      const error = new Error('No se puede eliminar una ciudad asociada a sucursales');
      error.status = 409;
      ciudadService.eliminarCiudad.mockRejectedValue(error);

      const req = { params: { id: '1' } };
      const res = mockResponse();
      const next = jest.fn();

      await CiudadController.eliminar(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
