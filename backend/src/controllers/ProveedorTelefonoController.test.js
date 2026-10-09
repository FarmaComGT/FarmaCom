jest.mock('../services/ProveedorTelefonoService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const ProveedorTelefonoService = require('../services/ProveedorTelefonoService');
const ProveedorTelefonoController = require('./ProveedorTelefonoController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });

describe('ProveedorTelefonoController', () => {
  describe('crear', () => {
    it('responde 201 con el teléfono creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ProveedorTelefonoService.crearTelefono.mockResolvedValue({ id_telefono: 1, numero: '123' });

      const req = { params: { id_proveedor: '1' }, body: { numero: '123' } };
      const res = mockResponse();

      await ProveedorTelefonoController.crear(req, res);

      expect(ProveedorTelefonoService.crearTelefono).toHaveBeenCalledWith({ id_proveedor: 1, numero: '123' });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id_proveedor: '1' }, body: {} };
      const res = mockResponse();

      await ProveedorTelefonoController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProveedorTelefonoService.crearTelefono).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (404 proveedor inexistente)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('El proveedor no existe');
      error.status = 404;
      ProveedorTelefonoService.crearTelefono.mockRejectedValue(error);

      const req = { params: { id_proveedor: '99' }, body: { numero: '123' } };
      const res = mockResponse();

      await ProveedorTelefonoController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('obtenerPorProveedor', () => {
    it('responde 200 con los teléfonos del proveedor', async () => {
      ProveedorTelefonoService.obtenerPorProveedor.mockResolvedValue([{ id_telefono: 1 }]);

      const req = { params: { id_proveedor: '1' } };
      const res = mockResponse();

      await ProveedorTelefonoController.obtenerPorProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando el service lanza "no encontrado"', async () => {
      const error = new Error('Teléfono no encontrado');
      error.status = 404;
      ProveedorTelefonoService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id_telefono: '99' } };
      const res = mockResponse();

      await ProveedorTelefonoController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el teléfono actualizado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      ProveedorTelefonoService.actualizarTelefono.mockResolvedValue({ id_telefono: 1, numero: '456' });

      const req = { params: { id_telefono: '1' }, body: { numero: '456' } };
      const res = mockResponse();

      await ProveedorTelefonoController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id_telefono: '1' }, body: {} };
      const res = mockResponse();

      await ProveedorTelefonoController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(ProveedorTelefonoService.actualizarTelefono).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      ProveedorTelefonoService.eliminarTelefono.mockResolvedValue({ mensaje: 'Teléfono eliminado correctamente' });

      const req = { params: { id_telefono: '1' } };
      const res = mockResponse();

      await ProveedorTelefonoController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
