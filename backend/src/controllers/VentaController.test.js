jest.mock('../services/VentaService');

const VentaService = require('../services/VentaService');
const VentaController = require('./VentaController');

const usuario = { id_usuario: 1, rol: 'dependiente', id_sucursal: 1 };
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('VentaController', () => {
  it('crea una venta en efectivo', async () => {
    VentaService.crearVenta.mockResolvedValue({ id_venta: 1 });
    const body = { detalles: [] };
    const res = mockResponse();

    await VentaController.crear({ body, usuario }, res, jest.fn());

    expect(VentaService.crearVenta).toHaveBeenCalledWith(body, usuario);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('crea un pago POS', async () => {
    VentaService.crearPagoPOS.mockResolvedValue({ external_id: 'x1' });
    const res = mockResponse();

    await VentaController.crearPagoPOS({ body: {}, usuario }, res, jest.fn());

    expect(VentaService.crearPagoPOS).toHaveBeenCalledWith({}, usuario);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('obtiene el estado de un pago POS', async () => {
    VentaService.obtenerEstadoPagoPOS.mockResolvedValue({ estado: 'pagado' });
    const res = mockResponse();

    await VentaController.obtenerEstadoPagoPOS(
      { params: { externalId: 'x1' }, usuario },
      res,
      jest.fn(),
    );

    expect(VentaService.obtenerEstadoPagoPOS).toHaveBeenCalledWith('x1', usuario);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('lista y obtiene ventas autorizadas', async () => {
    VentaService.obtenerTodas.mockResolvedValue([]);
    VentaService.obtenerPorId.mockResolvedValue({ id_venta: 2 });
    const res = mockResponse();

    await VentaController.obtenerTodas({ query: { estado: 'completada' }, usuario }, res, jest.fn());
    await VentaController.obtenerPorId({ params: { id: '2' }, usuario }, res, jest.fn());

    expect(VentaService.obtenerTodas).toHaveBeenCalledWith({ estado: 'completada' }, usuario);
    expect(VentaService.obtenerPorId).toHaveBeenCalledWith(2, usuario);
  });

  it('asocia un cliente a la venta', async () => {
    VentaService.asociarCliente.mockResolvedValue({ id_venta: 2, id_cliente: 5 });
    const res = mockResponse();

    await VentaController.asociarCliente(
      { params: { id: '2' }, body: { id_cliente: 5 }, usuario },
      res,
      jest.fn(),
    );

    expect(VentaService.asociarCliente).toHaveBeenCalledWith(2, 5, usuario);
  });

  it('anula una venta con el usuario autenticado', async () => {
    VentaService.anularVenta.mockResolvedValue({ id_venta: 2, estado: 'anulada' });
    const res = mockResponse();

    await VentaController.anular(
      { params: { id: '2' }, body: { motivo_anulacion: 'Error de cobro' }, usuario },
      res,
      jest.fn(),
    );

    expect(VentaService.anularVenta).toHaveBeenCalledWith(2, 'Error de cobro', usuario);
  });

  it('delega errores del servicio al middleware', async () => {
    const error = new Error('fallo inesperado');
    VentaService.crearVenta.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await VentaController.crear({ body: {}, usuario }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
