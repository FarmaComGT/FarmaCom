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
  beforeEach(() => {
    PromocionDAO.obtenerPrecioVentaMinimoDisponible.mockResolvedValue('15.00');
  });

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

    it('rechaza un precio promocional igual o mayor al precio normal mínimo', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });
      PromocionDAO.obtenerPrecioVentaMinimoDisponible.mockResolvedValue('10.00');

      await expect(PromocionService.crearPromocion(1, datosBase)).rejects.toMatchObject({
        status: 400,
        message: 'El precio de promoción debe ser menor que el precio normal mínimo de Q10.00',
      });
      expect(PromocionDAO.crear).not.toHaveBeenCalled();
    });

    it('compara en centavos para impedir que el redondeo guarde el precio normal', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });
      PromocionDAO.obtenerPrecioVentaMinimoDisponible.mockResolvedValue('10.00');

      await expect(PromocionService.crearPromocion(1, {
        ...datosBase,
        precio_promocion: 9.999,
      })).rejects.toMatchObject({ status: 400 });
      expect(PromocionDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza la promoción si la sucursal no tiene lotes vendibles con precio', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });
      PromocionDAO.obtenerPrecioVentaMinimoDisponible.mockResolvedValue(null);

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
        precio_promocion: 10,
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
        precio_promocion: 10,
        fecha_inicio: '2026-01-01', fecha_fin: '2026-01-31',
      });
      PromocionDAO.actualizar.mockResolvedValue({ id_promocion: 1, cantidad_minima: 8 });

      await PromocionService.actualizarPromocion(1, { cantidad_minima: 8 });

      expect(PromocionDAO.existeActivaSolapada).not.toHaveBeenCalled();
    });

    it('valida el precio resultante aunque solo se edite otra condición', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({
        id_promocion: 1,
        id_producto: 1,
        id_sucursal: 1,
        precio_promocion: 10,
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-01-31',
      });
      PromocionDAO.obtenerPrecioVentaMinimoDisponible.mockResolvedValue('9.50');

      await expect(PromocionService.actualizarPromocion(1, { cantidad_minima: 8 }))
        .rejects.toMatchObject({ status: 400 });
      expect(PromocionDAO.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('cambiarEstadoPromocion', () => {
    it('rechaza con 404 si la promoción no existe', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(PromocionService.cambiarEstadoPromocion(99, false)).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si ya estaba desactivada', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({ id_promocion: 1, activo: false });

      await expect(PromocionService.cambiarEstadoPromocion(1, false)).rejects.toMatchObject({ status: 409 });
    });

    it('reactiva una promoción cuando no se solapa con otra activa', async () => {
      const promocion = {
        id_promocion: 1,
        id_producto: 2,
        id_sucursal: 3,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-12-31',
        precio_promocion: 10,
        activo: false,
      };
      PromocionDAO.obtenerPorId.mockResolvedValue(promocion);
      PromocionDAO.existeActivaSolapada.mockResolvedValue(false);
      PromocionDAO.cambiarActivo.mockResolvedValue({ ...promocion, activo: true });

      await expect(PromocionService.cambiarEstadoPromocion(1, true)).resolves.toMatchObject({
        mensaje: 'Promoción activada correctamente',
        promocion: expect.objectContaining({ activo: true }),
      });
      expect(PromocionDAO.existeActivaSolapada).toHaveBeenCalledWith({
        id_producto: 2,
        id_sucursal: 3,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-12-31',
        excluir_id: 1,
      });
    });

    it('impide reactivar una promoción que se solapa con otra activa', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({
        id_promocion: 1,
        id_producto: 2,
        id_sucursal: 3,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-12-31',
        precio_promocion: 10,
        activo: false,
      });
      PromocionDAO.existeActivaSolapada.mockResolvedValue(true);

      await expect(PromocionService.cambiarEstadoPromocion(1, true))
        .rejects.toMatchObject({ status: 409 });
      expect(PromocionDAO.cambiarActivo).not.toHaveBeenCalled();
    });

    it('impide reactivar si el precio promocional ya no es menor al normal', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({
        id_promocion: 1,
        id_producto: 2,
        id_sucursal: 3,
        precio_promocion: 10,
        activo: false,
      });
      PromocionDAO.obtenerPrecioVentaMinimoDisponible.mockResolvedValue('9.00');

      await expect(PromocionService.cambiarEstadoPromocion(1, true))
        .rejects.toMatchObject({ status: 400 });
      expect(PromocionDAO.cambiarActivo).not.toHaveBeenCalled();
    });
  });

  describe('eliminarPromocion', () => {
    it('rechaza con 404 si la promoción no existe', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(null);

      await expect(PromocionService.eliminarPromocion(99)).rejects.toMatchObject({ status: 404 });
    });

    it('elimina una promoción existente', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({ id_promocion: 1 });
      PromocionDAO.eliminar.mockResolvedValue({ id_promocion: 1 });

      await expect(PromocionService.eliminarPromocion(1)).resolves.toEqual({
        mensaje: 'Promoción eliminada correctamente',
      });
    });

    it('responde 500 si la eliminación no afectó ningún registro', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({ id_promocion: 1 });
      PromocionDAO.eliminar.mockResolvedValue(null);

      await expect(PromocionService.eliminarPromocion(1)).rejects.toMatchObject({ status: 500 });
    });
  });

  describe('consultas', () => {
    it('lista las promociones de un producto existente', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1 });
      PromocionDAO.obtenerPorProducto.mockResolvedValue([{ id_promocion: 1 }]);

      await expect(PromocionService.obtenerPorProducto(1)).resolves.toEqual([{ id_promocion: 1 }]);
    });

    it('obtiene una promoción existente por id', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue({ id_promocion: 3 });

      await expect(PromocionService.obtenerPorId(3)).resolves.toEqual({ id_promocion: 3 });
    });
  });

  describe('validaciones al editar', () => {
    const existente = {
      id_promocion: 1,
      id_producto: 1,
      id_sucursal: 1,
      precio_promocion: '10.00',
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-01-31',
    };

    it.each([
      ['una cantidad mínima de cero', { cantidad_minima: 0 }, 'La cantidad mínima debe ser mayor a 0'],
      ['un precio de promoción negativo', { precio_promocion: -1 }, 'El precio de promoción debe ser mayor a 0'],
    ])('rechaza %s', async (_caso, campos, mensaje) => {
      PromocionDAO.obtenerPorId.mockResolvedValue(existente);

      await expect(PromocionService.actualizarPromocion(1, campos))
        .rejects.toMatchObject({ status: 400, message: mensaje });
      expect(PromocionDAO.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza fechas incoherentes al editar', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(existente);

      await expect(PromocionService.actualizarPromocion(1, { fecha_fin: '2025-12-01' }))
        .rejects.toMatchObject({ status: 400 });
      expect(PromocionDAO.existeActivaSolapada).not.toHaveBeenCalled();
    });

    it('excluye la propia promoción al validar el solapamiento', async () => {
      PromocionDAO.obtenerPorId.mockResolvedValue(existente);
      PromocionDAO.existeActivaSolapada.mockResolvedValue(false);
      PromocionDAO.actualizar.mockResolvedValue({ ...existente, fecha_fin: '2026-02-28' });

      await PromocionService.actualizarPromocion(1, { fecha_fin: '2026-02-28' });

      expect(PromocionDAO.existeActivaSolapada).toHaveBeenCalledWith({
        id_producto: 1,
        id_sucursal: 1,
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-02-28',
        excluir_id: 1,
      });
    });
  });
});
