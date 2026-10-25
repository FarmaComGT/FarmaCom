jest.mock('../services/PromocionService');

const PromocionService = require('../services/PromocionService');
const PromocionController = require('./PromocionController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PromocionController', () => {
  describe('crear', () => {
    it('responde 201 con la promoción creada', async () => {
      PromocionService.crearPromocion.mockResolvedValue({ id_promocion: 1 });

      const req = { params: { id_producto: '1' }, body: { cantidad_minima: 5 } };
      const res = mockResponse();

      await PromocionController.crear(req, res);

      expect(PromocionService.crearPromocion).toHaveBeenCalledWith(1, { cantidad_minima: 5 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('envía al middleware el error del service (404 producto inexistente)', async () => {
      const error = new Error('Producto no encontrado');
      error.status = 404;
      PromocionService.crearPromocion.mockRejectedValue(error);

      const req = { params: { id_producto: '99' }, body: {} };
      const res = mockResponse();
      const next = jest.fn();

      await PromocionController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
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
    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Promoción no encontrada');
      error.status = 404;
      PromocionService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await PromocionController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la promoción actualizada', async () => {
      PromocionService.actualizarPromocion.mockResolvedValue({ id_promocion: 1 });

      const req = { params: { id: '1' }, body: { cantidad_minima: 10 } };
      const res = mockResponse();

      await PromocionController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cambiarEstado', () => {
    it('activa correctamente cuando activo es true', async () => {
      PromocionService.cambiarEstadoPromocion.mockResolvedValue({ mensaje: 'Promoción activada correctamente' });

      const req = { params: { id: '1' }, body: { activo: true } };
      const res = mockResponse();

      await PromocionController.cambiarEstado(req, res);

      expect(PromocionService.cambiarEstadoPromocion).toHaveBeenCalledWith(1, true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('desactiva correctamente cuando activo es false', async () => {
      PromocionService.cambiarEstadoPromocion.mockResolvedValue({ mensaje: 'Promoción desactivada correctamente' });

      const req = { params: { id: '1' }, body: { activo: false } };
      const res = mockResponse();

      await PromocionController.cambiarEstado(req, res);

      expect(PromocionService.cambiarEstadoPromocion).toHaveBeenCalledWith(1, false);
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
