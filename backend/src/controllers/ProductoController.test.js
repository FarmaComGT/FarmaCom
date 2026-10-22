jest.mock('../services/ProductoService');

const ProductoService = require('../services/ProductoService');
const ProductoController = require('./ProductoController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ProductoController', () => {
  it('crea un producto', async () => {
    ProductoService.crearProducto.mockResolvedValue({ id_producto: 1 });
    const body = { codigo: 'P-1' };
    const res = mockResponse();

    await ProductoController.crear({ body }, res, jest.fn());

    expect(ProductoService.crearProducto).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('lista los productos', async () => {
    ProductoService.obtenerTodos.mockResolvedValue([{ id_producto: 1 }]);
    const res = mockResponse();

    await ProductoController.obtenerTodos({}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id_producto: 1 }]);
  });

  it('autocompleta usando la sucursal autenticada', async () => {
    ProductoService.autocompletarParaPOS.mockResolvedValue([]);
    const req = {
      query: { busqueda: 'para', limite: 5 },
      usuario: { id_sucursal: 3 },
    };
    const res = mockResponse();

    await ProductoController.autocompletarParaPOS(req, res, jest.fn());

    expect(ProductoService.autocompletarParaPOS).toHaveBeenCalledWith({
      busqueda: 'para', limite: 5, id_sucursal: 3,
    });
  });

  it('obtiene y actualiza un producto por id numérico', async () => {
    ProductoService.obtenerPorId.mockResolvedValue({ id_producto: 7 });
    ProductoService.actualizarProducto.mockResolvedValue({ id_producto: 7 });
    const res = mockResponse();

    await ProductoController.obtenerPorId({ params: { id: '7' } }, res, jest.fn());
    await ProductoController.actualizar(
      { params: { id: '7' }, body: { codigo: 'P-7' } },
      res,
      jest.fn(),
    );

    expect(ProductoService.obtenerPorId).toHaveBeenCalledWith(7);
    expect(ProductoService.actualizarProducto).toHaveBeenCalledWith(7, { codigo: 'P-7' });
  });

  it('cambia la configuración de mayoreo', async () => {
    ProductoService.cambiarAplicaMayoreo.mockResolvedValue({});
    const res = mockResponse();

    await ProductoController.cambiarAplicaMayoreo(
      { params: { id: '1' }, body: { aplica_mayoreo: true } },
      res,
      jest.fn(),
    );

    expect(ProductoService.cambiarAplicaMayoreo).toHaveBeenCalledWith(1, true);
  });

  it.each([
    [true, 'reactivarProducto'],
    [false, 'desactivarProducto'],
  ])('cambia el estado activo=%s', async (activo, metodo) => {
    ProductoService[metodo].mockResolvedValue({});
    const res = mockResponse();

    await ProductoController.cambiarEstado(
      { params: { id: '1' }, body: { activo } },
      res,
      jest.fn(),
    );

    expect(ProductoService[metodo]).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('delega errores del servicio al middleware', async () => {
    const error = new Error('fallo inesperado');
    ProductoService.obtenerPorId.mockRejectedValue(error);
    const res = mockResponse();
    const next = jest.fn();

    await ProductoController.obtenerPorId({ params: { id: '7' } }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
