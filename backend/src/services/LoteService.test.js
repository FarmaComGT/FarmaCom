jest.mock('../daos/LoteDAO');
jest.mock('../daos/ProductoDAO');
jest.mock('../daos/HistorialPrecioLoteDAO');

const LoteDAO = require('../daos/LoteDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');
const LoteService = require('./LoteService');

const cliente = { query: jest.fn() };

const loteExistente = {
  id_lote: 7,
  id_producto: 2,
  id_proveedor: 3,
  id_sucursal: 4,
  numero_lote: 'LT-001',
  cantidad_ingresada: 20,
  stock_actual: 12,
  precio_compra: '10.00',
  precio_venta: '15.00',
};

describe('LoteService', () => {
  beforeEach(() => {
    LoteDAO.ejecutarEnTransaccion.mockImplementation(
      async (operacion) => operacion(cliente),
    );
  });

  describe('crearLote', () => {
    it('inicializa el precio de compra del lote con el precio del producto', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({
        id_producto: 2,
        activo: true,
        precio_compra: '10.75',
      });
      LoteDAO.obtenerPorNumeroLote.mockResolvedValue(null);
      LoteDAO.crear.mockResolvedValue({ id_lote: 7 });
      LoteDAO.obtenerPorId.mockResolvedValue({ ...loteExistente, precio_compra: '10.75' });

      await LoteService.crearLote({
        id_producto: 2,
        id_proveedor: 3,
        id_sucursal: 4,
        numero_lote: 'LT-NUEVO',
        fecha_vencimiento: '2099-12-31',
        cantidad_ingresada: 20,
        precio_venta: 15,
        margen_ganancia: 39.5349,
      });

      expect(LoteDAO.crear).toHaveBeenCalledWith(expect.objectContaining({
        precio_compra: 10.75,
      }));
    });
  });

  describe('actualizarLote', () => {
    it('actualiza los datos editables y devuelve el lote completo', async () => {
      const loteActualizado = { ...loteExistente, numero_lote: 'LT-002' };
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.obtenerPorId.mockResolvedValue(loteActualizado);
      LoteDAO.obtenerPorNumeroLote.mockResolvedValue(null);
      LoteDAO.actualizar.mockResolvedValue(loteActualizado);

      const resultado = await LoteService.actualizarLote(7, { numero_lote: 'LT-002' });

      expect(LoteDAO.obtenerPorNumeroLote).toHaveBeenCalledWith(
        'LT-002',
        2,
        4,
        7,
        cliente,
      );
      expect(LoteDAO.actualizar).toHaveBeenCalledWith(
        7,
        { numero_lote: 'LT-002' },
        cliente,
      );
      expect(resultado).toEqual(loteActualizado);
    });

    it('rechaza un numero de lote duplicado para el producto y sucursal', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.obtenerPorNumeroLote.mockResolvedValue({ id_lote: 8 });

      await expect(
        LoteService.actualizarLote(7, { numero_lote: 'LT-DUP' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(LoteDAO.actualizar).not.toHaveBeenCalled();
    });

    it('impide reducir la cantidad ingresada por debajo del stock actual', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);

      await expect(
        LoteService.actualizarLote(7, { cantidad_ingresada: 10 }),
      ).rejects.toMatchObject({
        message: 'El stock actual no puede superar la cantidad ingresada del lote',
        status: 400,
      });
    });

    it('limpia ambos valores de mayoreo en una sola actualizacion', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.obtenerPorId.mockResolvedValue(loteExistente);
      LoteDAO.actualizar.mockResolvedValue(loteExistente);

      await LoteService.actualizarLote(7, {
        limpiar_mayoreo: true,
        precio_mayoreo: 15,
        cantidad_mayoreo: 5,
      });

      expect(LoteDAO.actualizar).toHaveBeenCalledWith(
        7,
        { limpiar_mayoreo: true },
        cliente,
      );
    });

    it('rechaza una actualizacion sin campos reconocidos', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);

      await expect(
        LoteService.actualizarLote(7, { campo_desconocido: 'valor' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('registra en una misma transaccion los cambios de compra y venta', async () => {
      const loteActualizado = {
        ...loteExistente,
        precio_compra: '11.50',
        precio_venta: '17.25',
      };
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.actualizar.mockResolvedValue(loteActualizado);
      LoteDAO.obtenerPorId.mockResolvedValue(loteActualizado);
      HistorialPrecioLoteDAO.registrarCambios.mockResolvedValue([
        { tipo_precio: 'compra' },
        { tipo_precio: 'venta' },
      ]);

      await LoteService.actualizarLote(
        7,
        { precio_compra: 11.5, precio_venta: 17.25 },
        9,
      );

      expect(HistorialPrecioLoteDAO.registrarCambios).toHaveBeenCalledWith(
        7,
        9,
        loteExistente,
        loteActualizado,
        cliente,
      );
    });

    it('no registra historial cuando el precio conserva el mismo valor', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.actualizar.mockResolvedValue(loteExistente);
      LoteDAO.obtenerPorId.mockResolvedValue(loteExistente);

      await LoteService.actualizarLote(7, { precio_venta: 15 }, 9);

      expect(HistorialPrecioLoteDAO.registrarCambios).not.toHaveBeenCalled();
    });
  });

  describe('eliminarLote', () => {
    it('devuelve 404 cuando el lote no existe', async () => {
      LoteDAO.obtenerPorId.mockResolvedValue(null);

      await expect(LoteService.eliminarLote(99)).rejects.toMatchObject({
        message: 'Lote no encontrado',
        status: 404,
      });
      expect(LoteDAO.eliminar).not.toHaveBeenCalled();
    });

    it('elimina un lote sin ventas asociadas', async () => {
      LoteDAO.obtenerPorId.mockResolvedValue(loteExistente);
      LoteDAO.eliminar.mockResolvedValue(loteExistente);

      await expect(LoteService.eliminarLote(7)).resolves.toEqual({
        mensaje: 'Lote eliminado correctamente',
      });
    });

    it('devuelve conflicto cuando el lote esta asociado a una venta', async () => {
      LoteDAO.obtenerPorId.mockResolvedValue(loteExistente);
      LoteDAO.eliminar.mockRejectedValue({ code: '23503' });

      await expect(LoteService.eliminarLote(7)).rejects.toMatchObject({
        message: 'No se puede eliminar un lote asociado a ventas o a un historial de precios',
        status: 409,
      });
    });
  });
});
