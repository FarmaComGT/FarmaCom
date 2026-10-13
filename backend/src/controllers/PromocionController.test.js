jest.mock('../services/PromocionService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const PromocionService = require('../services/PromocionService');
const PromocionController = require('./PromocionController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('PromocionController', () => {
  describe('crear', () => {
    it('responde 201 con la promoción creada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      PromocionService.crearPromocion.mockResolvedValue({ id_promocion: 1 });

      const req = { params: { id_producto: '1' }, body: { cantidad_minima: 5 } };
      const res = mockResponse();

      await PromocionController.crear(req, res);

      expect(PromocionService.crearPromocion).toHaveBeenCalledWith(1, { cantidad_minima: 5 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id_producto: '1' }, body: {} };
      const res = mockResponse();

      await PromocionController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(PromocionService.crearPromocion).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (404 producto inexistente)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Producto no encontrado');
      error.status = 404;
      PromocionService.crearPromocion.mockRejectedValue(error);

      const req = { params: { id_producto: '99' }, body: {} };
      const res = mockResponse();

      await PromocionController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('obtenerPorProducto', () => {
    it('responde 200 con las promociones del producto', async () => {
      PromocionService.obtenerPorProducto.mockResolvedValue([{ id_promocion: 1 }]);

      const req = { params: { id_producto: '1' } };
      const res = mockResponse();

      await PromocionController.obtenerPorProducto(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrada"', async () => {
      const error = new Error('Promoción no encontrada');
      error.status = 404;
      PromocionService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await PromocionController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la promoción actualizada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      PromocionService.actualizarPromocion.mockResolvedValue({ id_promocion: 1 });

      const req = { params: { id: '1' }, body: { cantidad_minima: 10 } };
      const res = mockResponse();

      await PromocionController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await PromocionController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(PromocionService.actualizarPromocion).not.toHaveBeenCalled();
    });
  });

  describe('cambiarEstado', () => {
    it('responde 400 cuando "activo" no es un booleano', async () => {
      const req = { params: { id: '1' }, body: { activo: 'si' } };
      const res = mockResponse();

      await PromocionController.cambiarEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(PromocionService.desactivarPromocion).not.toHaveBeenCalled();
    });

    it('responde 400 cuando se intenta "activar" desde este endpoint', async () => {
      const req = { params: { id: '1' }, body: { activo: true } };
      const res = mockResponse();

      await PromocionController.cambiarEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(PromocionService.desactivarPromocion).not.toHaveBeenCalled();
    });

    it('desactiva correctamente cuando activo es false', async () => {
      PromocionService.desactivarPromocion.mockResolvedValue({ mensaje: 'Promoción desactivada correctamente' });

      const req = { params: { id: '1' }, body: { activo: false } };
      const res = mockResponse();

      await PromocionController.cambiarEstado(req, res);

      expect(PromocionService.desactivarPromocion).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      PromocionService.eliminarPromocion.mockResolvedValue({ mensaje: 'Promoción eliminada correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await PromocionController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
