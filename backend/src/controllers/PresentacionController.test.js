jest.mock('../services/PresentacionService');

const PresentacionService = require('../services/PresentacionService');
const PresentacionController = require('./PresentacionController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PresentacionController', () => {
  describe('crear', () => {
    it('responde 201 con la presentación creada', async () => {
      PresentacionService.crearPresentacion.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });

      const req = { body: { nombre: 'Caja' } };
      const res = mockResponse();

      await PresentacionController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_presentacion: 1, nombre: 'Caja' });
    });

    it('envía al middleware el error del service (409 duplicado)', async () => {
      const error = new Error('Ya existe una presentación con ese nombre');
      error.status = 409;
      PresentacionService.crearPresentacion.mockRejectedValue(error);

      const req = { body: { nombre: 'Caja' } };
      const res = mockResponse();
      const next = jest.fn();

      await PresentacionController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
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
      PresentacionService.obtenerPorId.mockResolvedValue({ id_presentacion: 1, nombre: 'Caja' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await PresentacionController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Presentación no encontrada');
      error.status = 404;
      PresentacionService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await PresentacionController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la presentación actualizada', async () => {
      PresentacionService.actualizarPresentacion.mockResolvedValue({ id_presentacion: 1, nombre: 'Frasco' });

      const req = { params: { id: '1' }, body: { nombre: 'Frasco' } };
      const res = mockResponse();

      await PresentacionController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      PresentacionService.eliminarPresentacion.mockResolvedValue({ mensaje: 'Presentación eliminada correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await PresentacionController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('envía al middleware el error cuando está asociada a productos', async () => {
      const error = new Error('No se puede eliminar una presentación asociada a productos');
      error.status = 409;
      PresentacionService.eliminarPresentacion.mockRejectedValue(error);

      const req = { params: { id: '1' } };
      const res = mockResponse();
      const next = jest.fn();

      await PresentacionController.eliminar(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
