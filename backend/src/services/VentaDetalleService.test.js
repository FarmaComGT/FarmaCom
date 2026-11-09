jest.mock('../daos/VentaDAO');
jest.mock('../daos/PromocionDAO');
jest.mock('../daos/MovimientoInventarioDAO');

const VentaDAO = require('../daos/VentaDAO');
const MovimientoInventarioDAO = require('../daos/MovimientoInventarioDAO');
const {
  registrarDetallesYDescontarStock,
  reservarDetallesPagoPOS,
  liberarReservasPagoPOS,
  registrarDetallesYConsumirReservas,
  restaurarExistenciasDeDetalles,
} = require('./VentaDetalleService');

describe('VentaDetalleService', () => {
  const client = {};
  const detalles = [
    { id_lote: 2, cantidad: 2, precio_unitario: '7.50', costo_unitario: '4.10' },
    { id_lote: 1, cantidad: 1, precio_unitario: '10.00', costo_unitario: '6.25' },
  ];

  beforeEach(() => jest.clearAllMocks());

  it('descuenta cada lote antes de crear su detalle', async () => {
    VentaDAO.descontarStock
      .mockResolvedValueOnce({ id_lote: 2, stock_actual: 8 })
      .mockResolvedValueOnce({ id_lote: 1, stock_actual: 4 });
    VentaDAO.crearDetalle.mockResolvedValue({});

    await registrarDetallesYDescontarStock(21, detalles, {
      id_usuario: 7, id_sucursal: 3,
    }, client);

    expect(VentaDAO.descontarStock.mock.calls).toEqual([
      [2, 2, client],
      [1, 1, client],
    ]);
    expect(VentaDAO.crearDetalle.mock.calls).toEqual([
      [{ id_venta: 21, ...detalles[0] }, client],
      [{ id_venta: 21, ...detalles[1] }, client],
    ]);
    expect(VentaDAO.descontarStock.mock.invocationCallOrder[0])
      .toBeLessThan(VentaDAO.crearDetalle.mock.invocationCallOrder[0]);
    expect(MovimientoInventarioDAO.registrar.mock.calls).toEqual([
      [{
        id_lote: 2, tipo: 'venta', cantidad_anterior: 10, cantidad_nueva: 8,
        id_usuario: 7, id_sucursal: 3, motivo: 'Salida por venta', referencia: 'venta:21',
      }, client],
      [{
        id_lote: 1, tipo: 'venta', cantidad_anterior: 5, cantidad_nueva: 4,
        id_usuario: 7, id_sucursal: 3, motivo: 'Salida por venta', referencia: 'venta:21',
      }, client],
    ]);
  });

  it('falla antes de crear el detalle cuando el descuento atómico no encuentra stock', async () => {
    VentaDAO.descontarStock.mockResolvedValue(null);

    await expect(registrarDetallesYDescontarStock(21, detalles, {
      id_usuario: 7, id_sucursal: 3,
    }, client))
      .rejects.toMatchObject({
        status: 409,
        message: 'Stock insuficiente para el lote 2',
      });

    expect(VentaDAO.crearDetalle).not.toHaveBeenCalled();
  });

  it('reserva todos los detalles de un pago POS', async () => {
    VentaDAO.reservarStockPagoPOS.mockResolvedValue({ id_reserva: 1 });

    await reservarDetallesPagoPOS(5, detalles, client);

    expect(VentaDAO.reservarStockPagoPOS.mock.calls).toEqual([
      [5, { id_lote: 2, cantidad: 2 }, client],
      [5, { id_lote: 1, cantidad: 1 }, client],
    ]);
  });

  it('agrupa en una sola reserva los segmentos de precio del mismo lote', async () => {
    const detallesMixtos = [
      { id_lote: 2, cantidad: 2, precio_unitario: '6.00', id_promocion: 4 },
      { id_lote: 2, cantidad: 3, precio_unitario: '7.50', id_promocion: null },
    ];
    VentaDAO.reservarStockPagoPOS.mockResolvedValue({ id_reserva: 1 });

    await reservarDetallesPagoPOS(5, detallesMixtos, client);

    expect(VentaDAO.reservarStockPagoPOS).toHaveBeenCalledTimes(1);
    expect(VentaDAO.reservarStockPagoPOS).toHaveBeenCalledWith(
      5,
      { id_lote: 2, cantidad: 5 },
      client,
    );
  });

  it('libera unicamente las reservas que continuan activas', async () => {
    const reservas = [
      { id_reserva: 1, id_lote: 2, cantidad: 2 },
      { id_reserva: 2, id_lote: 1, cantidad: 1 },
    ];
    VentaDAO.obtenerReservasActivasPagoPOS.mockResolvedValue(reservas);
    VentaDAO.liberarReservaPagoPOS.mockResolvedValue({});

    await liberarReservasPagoPOS(5, client);

    expect(VentaDAO.liberarReservaPagoPOS.mock.calls).toEqual([
      [reservas[0], client],
      [reservas[1], client],
    ]);
  });

  it('consume reservas antes de crear los detalles de la venta', async () => {
    const reservas = [
      { id_reserva: 2, id_lote: 1, cantidad: 1 },
      { id_reserva: 1, id_lote: 2, cantidad: 2 },
    ];
    VentaDAO.obtenerReservasActivasPagoPOS.mockResolvedValue(reservas);
    VentaDAO.consumirReservaPagoPOS
      .mockResolvedValueOnce({ id_lote: 2, stock_actual: 8 })
      .mockResolvedValueOnce({ id_lote: 1, stock_actual: 4 });
    VentaDAO.crearDetalle.mockResolvedValue({});

    await registrarDetallesYConsumirReservas(
      21,
      { id_pago_pos: 5, detalles },
      { id_usuario: 7, id_sucursal: 3 },
      client,
    );

    expect(VentaDAO.consumirReservaPagoPOS).toHaveBeenCalledTimes(2);
    expect(VentaDAO.crearDetalle).toHaveBeenCalledTimes(2);
    expect(VentaDAO.consumirReservaPagoPOS.mock.invocationCallOrder[0])
      .toBeLessThan(VentaDAO.crearDetalle.mock.invocationCallOrder[0]);
  });

  it('consume una reserva agrupada y conserva los segmentos de precio', async () => {
    const detallesMixtos = [
      { id_lote: 2, cantidad: 2, precio_unitario: '6.00', id_promocion: 4 },
      { id_lote: 2, cantidad: 3, precio_unitario: '7.50', id_promocion: null },
    ];
    VentaDAO.obtenerReservasActivasPagoPOS.mockResolvedValue([
      { id_reserva: 1, id_lote: 2, cantidad: 5 },
    ]);
    VentaDAO.consumirReservaPagoPOS.mockResolvedValue({ id_lote: 2, stock_actual: 5 });
    VentaDAO.crearDetalle.mockResolvedValue({});

    await registrarDetallesYConsumirReservas(
      21,
      { id_pago_pos: 5, detalles: detallesMixtos },
      { id_usuario: 7, id_sucursal: 3, id_pago_pos: 5 },
      client,
    );

    expect(VentaDAO.consumirReservaPagoPOS).toHaveBeenCalledTimes(1);
    expect(VentaDAO.crearDetalle.mock.calls).toEqual([
      [{ id_venta: 21, id_lote: 2, cantidad: 2, precio_unitario: '6.00' }, client],
      [{ id_venta: 21, id_lote: 2, cantidad: 3, precio_unitario: '7.50' }, client],
    ]);
    expect(MovimientoInventarioDAO.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        id_lote: 2,
        cantidad_anterior: 10,
        cantidad_nueva: 5,
      }),
      client,
    );
  });

  it('restaura existencias al anular una venta', async () => {
    VentaDAO.restaurarStock
      .mockResolvedValueOnce({ id_lote: 2, stock_actual: 10 })
      .mockResolvedValueOnce({ id_lote: 1, stock_actual: 5 });

    await restaurarExistenciasDeDetalles(detalles, {
      id_venta: 21, id_usuario: 7, id_sucursal: 3, motivo: 'Venta duplicada',
    }, client);

    expect(VentaDAO.restaurarStock.mock.calls).toEqual([
      [2, 2, client],
      [1, 1, client],
    ]);
    expect(MovimientoInventarioDAO.registrar.mock.calls).toEqual([
      [{
        id_lote: 2, tipo: 'anulacion', cantidad_anterior: 8, cantidad_nueva: 10,
        id_usuario: 7, id_sucursal: 3, motivo: 'Venta duplicada', referencia: 'venta:21',
      }, client],
      [{
        id_lote: 1, tipo: 'anulacion', cantidad_anterior: 4, cantidad_nueva: 5,
        id_usuario: 7, id_sucursal: 3, motivo: 'Venta duplicada', referencia: 'venta:21',
      }, client],
    ]);
  });

  it('interrumpe la cancelación si no puede restaurar el stock de un lote', async () => {
    VentaDAO.restaurarStock.mockResolvedValueOnce({ id_lote: 2 }).mockResolvedValueOnce(null);

    await expect(restaurarExistenciasDeDetalles(detalles, {
      id_venta: 21, id_usuario: 7, id_sucursal: 3, motivo: 'Anulación',
    }, client)).rejects.toMatchObject({
      status: 500,
      message: 'No se pudo restaurar el stock del lote 1',
    });
  });
});
