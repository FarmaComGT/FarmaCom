jest.mock('../daos/LoteDAO');
jest.mock('../daos/ProductoDAO');
jest.mock('../daos/ProveedorDAO');
jest.mock('../daos/HistorialPrecioLoteDAO');

const LoteDAO = require('../daos/LoteDAO');
const ProductoDAO = require('../daos/ProductoDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const HistorialPrecioLoteDAO = require('../daos/HistorialPrecioLoteDAO');
const LoteService = require('./LoteService');

const mockClient = {};

const fechaFutura = () => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 30);
  return fecha.toISOString().slice(0, 10);
};

const datosLoteBase = {
  id_producto: 1,
  id_proveedor: 1,
  id_sucursal: 1,
  numero_lote: 'L-001',
  fecha_vencimiento: fechaFutura(),
  cantidad_ingresada: 10,
  precio_compra: 5,
  precio_venta: 8.5,
  margen_ganancia: 50,
};

describe('LoteService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    LoteDAO.ejecutarEnTransaccion.mockImplementation((fn) => fn(mockClient));
    ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1, activo: true });
  });

  describe('crearLote', () => {
    const idUsuario = 9;
    const loteCreado = { id_lote: 1, ...datosLoteBase };

    beforeEach(() => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1, activo: true });
      LoteDAO.obtenerPorNumeroLote.mockResolvedValue(null);
      LoteDAO.obtenerUltimoPorProductoSucursal.mockResolvedValue(null);
      LoteDAO.crear.mockResolvedValue(loteCreado);
      LoteDAO.obtenerPorId.mockResolvedValue(loteCreado);
      HistorialPrecioLoteDAO.registrarPorIngreso.mockResolvedValue([]);
    });

    it('crea el lote y registra sus precios iniciales dentro de una transacción', async () => {
      const resultado = await LoteService.crearLote(datosLoteBase, idUsuario);

      expect(ProductoDAO.obtenerPorId).toHaveBeenCalledWith(1, mockClient);
      expect(ProveedorDAO.obtenerPorId).toHaveBeenCalledWith(1, mockClient);
      expect(LoteDAO.bloquearHistorialProductoSucursal).toHaveBeenCalledWith(
        1,
        1,
        mockClient,
      );
      expect(LoteDAO.obtenerPorNumeroLote).toHaveBeenCalledWith(
        'L-001',
        1,
        1,
        null,
        mockClient,
      );
      expect(LoteDAO.obtenerUltimoPorProductoSucursal).toHaveBeenCalledWith(
        1,
        1,
        mockClient,
      );
      expect(LoteDAO.crear).toHaveBeenCalledWith(
        expect.objectContaining({ precio_compra: 5, precio_venta: 8.5 }),
        mockClient,
      );
      expect(HistorialPrecioLoteDAO.registrarPorIngreso).toHaveBeenCalledWith(
        null,
        loteCreado,
        idUsuario,
        mockClient,
      );
      expect(LoteDAO.obtenerPorId).toHaveBeenCalledWith(1, mockClient);
      expect(resultado).toEqual(loteCreado);
    });

    it('compara el lote nuevo con el último de la misma sucursal', async () => {
      const loteAnterior = {
        id_lote: 7,
        id_producto: 1,
        id_sucursal: 1,
        precio_compra: '4.50',
        precio_venta: '8.00',
      };
      LoteDAO.obtenerUltimoPorProductoSucursal.mockResolvedValue(loteAnterior);

      await LoteService.crearLote(datosLoteBase, idUsuario);

      expect(HistorialPrecioLoteDAO.registrarPorIngreso).toHaveBeenCalledWith(
        loteAnterior,
        loteCreado,
        idUsuario,
        mockClient,
      );
    });

    it('propaga un error del historial para revertir la operación', async () => {
      const error = new Error('No se pudo registrar el historial');
      HistorialPrecioLoteDAO.registrarPorIngreso.mockRejectedValue(error);

      await expect(
        LoteService.crearLote(datosLoteBase, idUsuario),
      ).rejects.toBe(error);

      expect(LoteDAO.obtenerPorId).not.toHaveBeenCalled();
    });

    it('crea un lote sin fecha de vencimiento', async () => {
      await LoteService.crearLote({
        ...datosLoteBase,
        fecha_vencimiento: undefined,
      }, idUsuario);

      expect(LoteDAO.crear).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_vencimiento: null, precio_compra: 5 }),
        mockClient,
      );
    });

    it('rechaza la creación sin un usuario válido', async () => {
      await expect(
        LoteService.crearLote(datosLoteBase, null),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Se requiere un usuario válido para registrar los precios',
      });

      expect(ProductoDAO.obtenerPorId).not.toHaveBeenCalled();
      expect(LoteDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza el lote si no tiene precio de compra propio', async () => {
      await expect(
        LoteService.crearLote({ ...datosLoteBase, precio_compra: undefined }, idUsuario),
      ).rejects.toMatchObject({ status: 400 });
      expect(LoteDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si el producto no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        LoteService.crearLote(datosLoteBase, idUsuario),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el producto está inactivo', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue({ id_producto: 1, activo: false });

      await expect(
        LoteService.crearLote(datosLoteBase, idUsuario),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 409 si el proveedor está inactivo', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1, activo: false });

      await expect(LoteService.crearLote(datosLoteBase, idUsuario)).rejects.toMatchObject({
        status: 409,
        message: 'No se puede asignar un proveedor inactivo',
      });
      expect(ProveedorDAO.obtenerPorId).toHaveBeenCalledWith(1, mockClient);
      expect(LoteDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 400 si la fecha de vencimiento ya pasó', async () => {
      await expect(
        LoteService.crearLote(
          { ...datosLoteBase, fecha_vencimiento: '2020-01-01' },
          idUsuario,
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si la cantidad ingresada no es un entero positivo', async () => {
      await expect(
        LoteService.crearLote({ ...datosLoteBase, cantidad_ingresada: 0 }, idUsuario),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 409 si el número de lote ya existe para ese producto y sucursal', async () => {
      LoteDAO.obtenerPorNumeroLote.mockResolvedValue({ id_lote: 5 });

      await expect(
        LoteService.crearLote(datosLoteBase, idUsuario),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rechaza con 400 si el precio de venta es negativo', async () => {
      await expect(
        LoteService.crearLote({ ...datosLoteBase, precio_venta: -1 }, idUsuario),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si solo viene precio_mayoreo sin cantidad_mayoreo', async () => {
      await expect(
        LoteService.crearLote({ ...datosLoteBase, precio_mayoreo: 7 }, idUsuario),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('obtenerPorSucursal', () => {
    it('delega al DAO', async () => {
      LoteDAO.obtenerPorSucursal.mockResolvedValue([{ id_lote: 1 }]);

      await expect(LoteService.obtenerPorSucursal(1)).resolves.toEqual([{ id_lote: 1 }]);
    });
  });

  describe('obtenerPorProducto', () => {
    it('rechaza con 404 si el producto no existe', async () => {
      ProductoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(LoteService.obtenerPorProducto(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si no existe', async () => {
      LoteDAO.obtenerPorId.mockResolvedValue(null);

      await expect(LoteService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarLote', () => {
    const loteExistente = {
      id_lote: 1,
      id_producto: 1,
      id_proveedor: 1,
      id_sucursal: 1,
      numero_lote: 'L-001',
      cantidad_ingresada: 10,
      stock_actual: 10,
      precio_compra: 5,
      precio_venta: 8.5,
    };

    it('rechaza con 404 si el lote no existe', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(null);

      await expect(LoteService.actualizarLote(99, { numero_lote: 'X' })).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 400 si no hay campos válidos para actualizar', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);

      await expect(LoteService.actualizarLote(1, { campo_invalido: 'x' })).rejects.toMatchObject({ status: 400 });
    });

    it('rechaza con 400 si el stock actual supera la cantidad ingresada', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);

      await expect(
        LoteService.actualizarLote(1, { stock_actual: 99 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('actualiza el lote sin cambio de precio, sin tocar el historial', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.actualizar.mockResolvedValue({ ...loteExistente, numero_lote: 'L-002' });
      LoteDAO.obtenerPorId.mockResolvedValue({ ...loteExistente, numero_lote: 'L-002' });

      const resultado = await LoteService.actualizarLote(1, { numero_lote: 'L-002' });

      expect(resultado.numero_lote).toBe('L-002');
      expect(HistorialPrecioLoteDAO.registrarPorIngreso).not.toHaveBeenCalled();
    });

    it('permite quitar la fecha de vencimiento de un lote', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue({
        ...loteExistente,
        fecha_vencimiento: fechaFutura(),
      });
      LoteDAO.actualizar.mockResolvedValue({
        ...loteExistente,
        fecha_vencimiento: null,
      });
      LoteDAO.obtenerPorId.mockResolvedValue({
        ...loteExistente,
        fecha_vencimiento: null,
      });

      const resultado = await LoteService.actualizarLote(1, { fecha_vencimiento: null });

      expect(LoteDAO.actualizar).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ fecha_vencimiento: null }),
        mockClient,
      );
      expect(resultado.fecha_vencimiento).toBeNull();
    });

    it('permite corregir un precio sin registrarlo como evolución', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.actualizar.mockResolvedValue({ ...loteExistente, precio_venta: 9.5 });
      LoteDAO.obtenerPorId.mockResolvedValue({ ...loteExistente, precio_venta: 9.5 });

      await LoteService.actualizarLote(1, { precio_venta: 9.5 });

      expect(HistorialPrecioLoteDAO.registrarPorIngreso).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el nuevo número de lote ya existe para el producto/sucursal', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.obtenerPorNumeroLote.mockResolvedValue({ id_lote: 2 });

      await expect(
        LoteService.actualizarLote(1, { numero_lote: 'L-003' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(LoteDAO.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza cambiar el lote a un proveedor inactivo', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 2, activo: false });

      await expect(
        LoteService.actualizarLote(1, { id_proveedor: 2 }),
      ).rejects.toMatchObject({ status: 409 });
      expect(ProveedorDAO.obtenerPorId).toHaveBeenCalledWith(2, mockClient);
      expect(LoteDAO.actualizar).not.toHaveBeenCalled();
    });

    it('limpia ambos valores de mayoreo en una sola actualización', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      LoteDAO.actualizar.mockResolvedValue({ ...loteExistente, precio_mayoreo: null, cantidad_mayoreo: null });
      LoteDAO.obtenerPorId.mockResolvedValue({ ...loteExistente, precio_mayoreo: null, cantidad_mayoreo: null });

      await LoteService.actualizarLote(1, { limpiar_mayoreo: true });

      const datosEnviados = LoteDAO.actualizar.mock.calls[0][1];
      expect(datosEnviados).not.toHaveProperty('precio_mayoreo');
      expect(datosEnviados).not.toHaveProperty('cantidad_mayoreo');
    });

    it('traduce el error de constraint 23505 a un 409', async () => {
      LoteDAO.obtenerFilaPorId.mockResolvedValue(loteExistente);
      const errorDb = new Error('duplicado');
      errorDb.code = '23505';
      LoteDAO.actualizar.mockRejectedValue(errorDb);

      await expect(
        LoteService.actualizarLote(1, { numero_lote: 'L-003' }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('eliminarLote', () => {
    it('rechaza con 404 si no existe', async () => {
      LoteDAO.obtenerPorId.mockResolvedValue(null);

      await expect(LoteService.eliminarLote(99)).rejects.toMatchObject({ status: 404 });
    });

    it('elimina correctamente', async () => {
      LoteDAO.obtenerPorId.mockResolvedValue({ id_lote: 1 });
      LoteDAO.eliminar.mockResolvedValue(true);

      await expect(LoteService.eliminarLote(1)).resolves.toEqual({ mensaje: 'Lote eliminado correctamente' });
    });

    it('traduce la violación de FK a un 409 legible', async () => {
      LoteDAO.obtenerPorId.mockResolvedValue({ id_lote: 1 });
      const errorDb = new Error('fk');
      errorDb.code = '23503';
      LoteDAO.eliminar.mockRejectedValue(errorDb);

      await expect(LoteService.eliminarLote(1)).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('obtenerAlertas', () => {
    it('delega al DAO', async () => {
      LoteDAO.obtenerAlertas.mockResolvedValue([{ id_lote: 1 }]);

      await expect(LoteService.obtenerAlertas(1)).resolves.toEqual([{ id_lote: 1 }]);
    });
  });
});
