jest.mock('../daos/VentaDAO');

const VentaDAO = require('../daos/VentaDAO');
const {
  registrarDetallesYDescontarStock,
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
    VentaDAO.descontarStock.mockResolvedValue({ id_lote: 1 });
    VentaDAO.crearDetalle.mockResolvedValue({});

    await registrarDetallesYDescontarStock(21, detalles, client);

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
  });

  it('falla antes de crear el detalle cuando el descuento atómico no encuentra stock', async () => {
    VentaDAO.descontarStock.mockResolvedValue(null);

    await expect(registrarDetallesYDescontarStock(21, detalles, client))
      .rejects.toMatchObject({
        status: 409,
        message: 'Stock insuficiente para el lote 2',
      });

    expect(VentaDAO.crearDetalle).not.toHaveBeenCalled();
  });

  it('restaura existencias al anular una venta', async () => {
    VentaDAO.restaurarStock.mockResolvedValue({ id_lote: 1 });

    await restaurarExistenciasDeDetalles(detalles, client);

    expect(VentaDAO.restaurarStock.mock.calls).toEqual([
      [2, 2, client],
      [1, 1, client],
    ]);
  });
});
