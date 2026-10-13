jest.mock('../services/ProveedorService');

const ProveedorService = require('../services/ProveedorService');
const ProveedorController = require('./ProveedorController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ProveedorController', () => {
  describe('crear', () => {
    it('responde 201 con el proveedor creado', async () => {
      ProveedorService.crearProveedor.mockResolvedValue({ id_proveedor: 1, nombre: 'ABC' });

      const req = { body: { nombre: 'ABC' } };
      const res = mockResponse();

      await ProveedorController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_proveedor: 1, nombre: 'ABC' });
    });

    it('envía al middleware el error del service (409 duplicado)', async () => {
      const error = new Error('Ya existe un proveedor con ese nombre');
      error.status = 409;
      ProveedorService.crearProveedor.mockRejectedValue(error);

      const req = { body: { nombre: 'ABC' } };
      const res = mockResponse();
      const next = jest.fn();

      await ProveedorController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
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
    it('envía al middleware el error cuando el proveedor no existe', async () => {
      const error = new Error('Proveedor no encontrado');
      error.status = 404;
      ProveedorService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await ProveedorController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el proveedor actualizado', async () => {
      ProveedorService.actualizarProveedor.mockResolvedValue({ id_proveedor: 1, nombre: 'XYZ' });

      const req = { params: { id: '1' }, body: { nombre: 'XYZ' } };
      const res = mockResponse();

      await ProveedorController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
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

    it('envía al middleware el error del service', async () => {
      const error = new Error('Proveedor no encontrado');
      error.status = 404;
      ProveedorService.cambiarEstado.mockRejectedValue(error);

      const req = { params: { id: '1' }, body: { activo: true } };
      const res = mockResponse();
      const next = jest.fn();

      await ProveedorController.cambiarEstado(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
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
