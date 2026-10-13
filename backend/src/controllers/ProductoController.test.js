jest.mock('../services/ProductoService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const ProductoService = require('../services/ProductoService');
const ProductoController = require('./ProductoController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('ProductoController', () => {
  describe('crear', () => {
    it('responde 201 con el producto creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ProductoService.crearProducto.mockResolvedValue({ id_producto: 1 });

      const req = { body: { codigo: 'MED001' } };
      const res = mockResponse();

      await ProductoController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await ProductoController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProductoService.crearProducto).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 duplicado)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Ya existe un producto con ese código');
      error.status = 409;
      ProductoService.crearProducto.mockRejectedValue(error);

      const req = { body: {} };
      const res = mockResponse();

      await ProductoController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerTodos', () => {
    it('responde 200 con la lista de productos', async () => {
      ProductoService.obtenerTodos.mockResolvedValue([{ id_producto: 1 }]);
      const res = mockResponse();

      await ProductoController.obtenerTodos({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('autocompletarParaPOS', () => {
    it('responde 200 con los resultados del autocompletado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ProductoService.autocompletarParaPOS.mockResolvedValue([{ id_producto: 1 }]);

      const req = { query: { busqueda: 'para', limite: '5' }, usuario: { id_sucursal: 1 } };
      const res = mockResponse();

      await ProductoController.autocompletarParaPOS(req, res);

      expect(ProductoService.autocompletarParaPOS).toHaveBeenCalledWith({
        busqueda: 'para', limite: '5', id_sucursal: 1,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { query: {}, usuario: { id_sucursal: 1 } };
      const res = mockResponse();

      await ProductoController.autocompletarParaPOS(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProductoService.autocompletarParaPOS).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando no existe', async () => {
      const error = new Error('Producto no encontrado');
      error.status = 404;
      ProductoService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await ProductoController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el producto actualizado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ProductoService.actualizarProducto.mockResolvedValue({ id_producto: 1 });

      const req = { params: { id: '1' }, body: { nombre_generico: 'X' } };
      const res = mockResponse();

      await ProductoController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await ProductoController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProductoService.actualizarProducto).not.toHaveBeenCalled();
    });
  });

  describe('cambiarAplicaMayoreo', () => {
    it('responde 400 cuando "aplica_mayoreo" no es un booleano', async () => {
      const req = { params: { id: '1' }, body: { aplica_mayoreo: 'si' } };
      const res = mockResponse();

      await ProductoController.cambiarAplicaMayoreo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProductoService.cambiarAplicaMayoreo).not.toHaveBeenCalled();
    });

    it('responde 200 cuando el valor es válido', async () => {
      ProductoService.cambiarAplicaMayoreo.mockResolvedValue({ mensaje: 'Mayoreo activado correctamente' });

      const req = { params: { id: '1' }, body: { aplica_mayoreo: true } };
      const res = mockResponse();

      await ProductoController.cambiarAplicaMayoreo(req, res);

      expect(ProductoService.cambiarAplicaMayoreo).toHaveBeenCalledWith(1, true);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 400 cuando "activo" no es un booleano', async () => {
      const req = { params: { id: '1' }, body: { activo: 'si' } };
      const res = mockResponse();

      await ProductoController.cambiarEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('reactiva el producto cuando activo es true', async () => {
      ProductoService.reactivarProducto.mockResolvedValue({ mensaje: 'Producto reactivado correctamente' });

      const req = { params: { id: '1' }, body: { activo: true } };
      const res = mockResponse();

      await ProductoController.cambiarEstado(req, res);

      expect(ProductoService.reactivarProducto).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('desactiva el producto cuando activo es false', async () => {
      ProductoService.desactivarProducto.mockResolvedValue({ mensaje: 'Producto desactivado correctamente' });

      const req = { params: { id: '1' }, body: { activo: false } };
      const res = mockResponse();

      await ProductoController.cambiarEstado(req, res);

      expect(ProductoService.desactivarProducto).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
