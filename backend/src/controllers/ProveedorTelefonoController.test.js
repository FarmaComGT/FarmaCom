jest.mock('../services/ProveedorTelefonoService');

const ProveedorTelefonoService = require('../services/ProveedorTelefonoService');
const ProveedorTelefonoController = require('./ProveedorTelefonoController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ProveedorTelefonoController', () => {
  describe('crear', () => {
    it('responde 201 con el teléfono creado', async () => {
      ProveedorTelefonoService.crearTelefono.mockResolvedValue({ id_telefono: 1, numero: '123' });

      const req = { params: { id_proveedor: '1' }, body: { numero: '123' } };
      const res = mockResponse();

      await ProveedorTelefonoController.crear(req, res);

      expect(ProveedorTelefonoService.crearTelefono).toHaveBeenCalledWith({ id_proveedor: 1, numero: '123' });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('envía al middleware el error del service (404 proveedor inexistente)', async () => {
      const error = new Error('El proveedor no existe');
      error.status = 404;
      ProveedorTelefonoService.crearTelefono.mockRejectedValue(error);

      const req = { params: { id_proveedor: '99' }, body: { numero: '123' } };
      const res = mockResponse();
      const next = jest.fn();

      await ProveedorTelefonoController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
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
    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Teléfono no encontrado');
      error.status = 404;
      ProveedorTelefonoService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id_telefono: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await ProveedorTelefonoController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el teléfono actualizado', async () => {
      ProveedorTelefonoService.actualizarTelefono.mockResolvedValue({ id_telefono: 1, numero: '456' });

      const req = { params: { id_telefono: '1' }, body: { numero: '456' } };
      const res = mockResponse();

      await ProveedorTelefonoController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
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
