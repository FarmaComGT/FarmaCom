jest.mock('../daos/PromocionDAO');
jest.mock('../daos/ProductoDAO');

const PromocionDAO = require('../daos/PromocionDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const PromocionService = require('./PromocionService');

const datosBase = {
  id_sucursal: 1,
  cantidad_minima: 5,
  precio_promocion: 10,
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-01-31',
};

describe('PromocionService', () => {
  describe('crearPromocion', () => {
    it('crea la promoción cuando todo es válido', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });
      PromocionDAO.existeActivaSolapada.mockResolvedValue(false);
      PromocionDAO.crear.mockResolvedValue({ id_promocion: 1 });

      await expect(PromocionService.crearPromocion(1, datosBase)).resolves.toEqual({
        id_promocion: 1,
      });
    });

    it('rechaza con 404 si el producto no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(PromocionService.crearPromocion(99, datosBase)).rejects.toMatchObject({
        status: 404,
      });
      expect(PromocionDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 400 si la cantidad mínima no es positiva', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });

      await expect(
        PromocionService.crearPromocion(1, { ...datosBase, cantidad_minima: 0 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si el precio de promoción no es positivo', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });

      await expect(
        PromocionService.crearPromocion(1, { ...datosBase, precio_promocion: 0 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si fecha_fin no es posterior a fecha_inicio', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });

      await expect(
        PromocionService.crearPromocion(1, {
          ...datosBase,
          fecha_inicio: '2026-02-01',
          fecha_fin: '2026-01-01',
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 409 si hay una promoción activa solapada', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });
      PromocionDAO.existeActivaSolapada.mockResolvedValue(true);

      await expect(PromocionService.crearPromocion(1, datosBase)).rejects.toMatchObject({
        status: 409,
      });
      expect(PromocionDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorProducto', () => {
    it('rechaza con 404 si el producto no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(PromocionService.obtenerPorProducto(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si la promoción no existe', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(PromocionService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarPromocion', () => {
    it('rechaza con 404 si la promoción no existe', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        PromocionService.actualizarPromocion(99, { cantidad_minima: 1 }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si la nueva fecha se solapa con otra promoción activa', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({
        id_promocion: 1,
        id_producto: 1,
        id_sucursal: 1,
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-01-31',
      });
      PromocionDAO.existeActivaSolapada.mockResolvedValue(true);

      await expect(
        PromocionService.actualizarPromocion(1, { fecha_fin: '2026-02-15' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(PromocionDAO.actualizar).not.toHaveBeenCalled();
    });

    it('no valida solapamiento si no se tocan las fechas', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({
        id_promocion: 1, id_producto: 1, id_sucursal: 1,
        fecha_inicio: '2026-01-01', fecha_fin: '2026-01-31',
      });
      PromocionDAO.actualizar.mockResolvedValue({ id_promocion: 1, cantidad_minima: 8 });

      await PromocionService.actualizarPromocion(1, { cantidad_minima: 8 });

      expect(PromocionDAO.existeActivaSolapada).not.toHaveBeenCalled();
    });
  });

  describe('desactivarPromocion', () => {
    it('rechaza con 404 si la promoción no existe', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(PromocionService.desactivarPromocion(99)).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si ya estaba desactivada', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({ id_promocion: 1, activo: false });

      await expect(PromocionService.desactivarPromocion(1)).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('eliminarPromocion', () => {
    it('rechaza con 404 si la promoción no existe', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(PromocionService.eliminarPromocion(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
