jest.mock('../services/ProveedorEmailService');

const ProveedorEmailService = require('../services/ProveedorEmailService');
const ProveedorEmailController = require('./ProveedorEmailController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ProveedorEmailController', () => {
  describe('crear', () => {
    it('responde 201 con el correo creado', async () => {
      ProveedorEmailService.crearEmail.mockResolvedValue({ id_email: 1, correo: 'a@b.com' });

      const req = { params: { id_proveedor: '1' }, body: { correo: 'a@b.com' } };
      const res = mockResponse();

      await ProveedorEmailController.crear(req, res);

      expect(ProveedorEmailService.crearEmail).toHaveBeenCalledWith({ id_proveedor: 1, correo: 'a@b.com' });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('envía al middleware el error del service (404 proveedor inexistente)', async () => {
      const error = new Error('El proveedor no existe');
      error.status = 404;
      ProveedorEmailService.crearEmail.mockRejectedValue(error);

      const req = { params: { id_proveedor: '99' }, body: { correo: 'a@b.com' } };
      const res = mockResponse();
      const next = jest.fn();

      await ProveedorEmailController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorProveedor', () => {
    it('responde 200 con los correos del proveedor', async () => {
      ProveedorEmailService.obtenerPorProveedor.mockResolvedValue([{ id_email: 1 }]);

      const req = { params: { id_proveedor: '1' } };
      const res = mockResponse();

      await ProveedorEmailController.obtenerPorProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorId', () => {
    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Correo no encontrado');
      error.status = 404;
      ProveedorEmailService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id_email: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await ProveedorEmailController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el correo actualizado', async () => {
      ProveedorEmailService.actualizarEmail.mockResolvedValue({ id_email: 1, correo: 'nuevo@b.com' });

      const req = { params: { id_email: '1' }, body: { correo: 'nuevo@b.com' } };
      const res = mockResponse();

      await ProveedorEmailController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      ProveedorEmailService.eliminarEmail.mockResolvedValue({ mensaje: 'Correo eliminado correctamente' });

      const req = { params: { id_email: '1' } };
      const res = mockResponse();

      await ProveedorEmailController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
