jest.mock('../services/ProveedorService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const ProveedorService = require('../services/ProveedorService');
const ProveedorController = require('./ProveedorController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('ProveedorController', () => {
  describe('crear', () => {
    it('responde 201 con el proveedor creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ProveedorService.crearProveedor.mockResolvedValue({ id_proveedor: 1, nombre: 'ABC' });

      const req = { body: { nombre: 'ABC' } };
      const res = mockResponse();

      await ProveedorController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_proveedor: 1, nombre: 'ABC' });
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {} };
      const res = mockResponse();

      await ProveedorController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProveedorService.crearProveedor).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 duplicado)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Ya existe un proveedor con ese nombre');
      error.status = 409;
      ProveedorService.crearProveedor.mockRejectedValue(error);

      const req = { body: { nombre: 'ABC' } };
      const res = mockResponse();

      await ProveedorController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('obtenerTodos', () => {
    it('responde 200 con la lista de proveedores', async () => {
      ProveedorService.obtenerTodos.mockResolvedValue([{ id_proveedor: 1 }]);
      const res = mockResponse();

      await ProveedorController.obtenerTodos({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_proveedor: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrado"', async () => {
      const error = new Error('Proveedor no encontrado');
      error.status = 404;
      ProveedorService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();

      await ProveedorController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Proveedor no encontrado' });
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el proveedor actualizado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ProveedorService.actualizarProveedor.mockResolvedValue({ id_proveedor: 1, nombre: 'XYZ' });

      const req = { params: { id: '1' }, body: { nombre: 'XYZ' } };
      const res = mockResponse();

      await ProveedorController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await ProveedorController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProveedorService.actualizarProveedor).not.toHaveBeenCalled();
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 cuando "activo" es un booleano válido', async () => {
      ProveedorService.cambiarEstado.mockResolvedValue({ id_proveedor: 1, activo: false });

      const req = { params: { id: '1' }, body: { activo: false } };
      const res = mockResponse();

      await ProveedorController.cambiarEstado(req, res);

      expect(ProveedorService.cambiarEstado).toHaveBeenCalledWith(1, false);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando "activo" no es un booleano', async () => {
      const req = { params: { id: '1' }, body: { activo: 'si' } };
      const res = mockResponse();

      await ProveedorController.cambiarEstado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProveedorService.cambiarEstado).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      ProveedorService.eliminarProveedor.mockResolvedValue({ mensaje: 'Proveedor eliminado correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await ProveedorController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
