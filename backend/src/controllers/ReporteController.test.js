jest.mock('../services/ReporteService');

const ReporteService = require('../services/ReporteService');
const ReporteController = require('./ReporteController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ReporteController', () => {
  const casos = [
    ['obtenerResumenVentas', 'obtenerResumenVentas'],
    ['obtenerSerieVentas', 'obtenerSerieVentas'],
    ['obtenerMetodosPago', 'obtenerMetodosPago'],
    ['obtenerResumenProductos', 'obtenerResumenProductos'],
    ['obtenerTopProductos', 'obtenerTopProductos'],
    ['obtenerRentabilidad', 'obtenerRentabilidad'],
  ];

  it.each(casos)('%s conserva la respuesta exitosa del servicio', async (controlador, servicio) => {
    const datos = [{ valor: 1 }];
    const query = { id_sucursal: 1 };
    ReporteService[servicio].mockResolvedValue(datos);
    const res = mockResponse();

    await ReporteController[controlador]({ query }, res, jest.fn());

    expect(ReporteService[servicio]).toHaveBeenCalledWith(query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(datos);
  });

  it('delega los errores del servicio al middleware', async () => {
    const error = new Error('fallo inesperado');
    ReporteService.obtenerResumenVentas.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await ReporteController.obtenerResumenVentas({ query: {} }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
