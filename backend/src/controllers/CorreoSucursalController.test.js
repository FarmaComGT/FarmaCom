jest.mock('../services/CorreoSucursalService');

const CorreoSucursalService = require('../services/CorreoSucursalService');
const CorreoSucursalController = require('./CorreoSucursalController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CorreoSucursalController', () => {
  describe('crear', () => {
    it('responde 201 con el correo creado', async () => {
      CorreoSucursalService.crearCorreo.mockResolvedValue({ id_correo_sucursal: 1, correo: 'a@b.com' });

      const req = { params: { id_sucursal: '1' }, body: { correo: 'a@b.com' } };
      const res = mockResponse();

      await CorreoSucursalController.crear(req, res);

      expect(CorreoSucursalService.crearCorreo).toHaveBeenCalledWith({ id_sucursal: 1, correo: 'a@b.com' });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('envía al middleware el error del service (404 sucursal inexistente)', async () => {
      const error = new Error('La sucursal no existe');
      error.status = 404;
      CorreoSucursalService.crearCorreo.mockRejectedValue(error);

      const req = { params: { id_sucursal: '99' }, body: { correo: 'a@b.com' } };
      const res = mockResponse();
      const next = jest.fn();

      await CorreoSucursalController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorSucursal', () => {
    it('responde 200 con los correos de la sucursal', async () => {
      CorreoSucursalService.obtenerPorSucursal.mockResolvedValue([{ id_correo_sucursal: 1 }]);

      const req = { params: { id_sucursal: '1' } };
      const res = mockResponse();

      await CorreoSucursalController.obtenerPorSucursal(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorId', () => {
    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Correo no encontrado');
      error.status = 404;
      CorreoSucursalService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await CorreoSucursalController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el correo actualizado', async () => {
      CorreoSucursalService.actualizarCorreo.mockResolvedValue({ id_correo_sucursal: 1, correo: 'nuevo@b.com' });

      const req = { params: { id: '1' }, body: { correo: 'nuevo@b.com' } };
      const res = mockResponse();

      await CorreoSucursalController.actualizar(req, res);

      expect(CorreoSucursalService.actualizarCorreo).toHaveBeenCalledWith(1, { correo: 'nuevo@b.com' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      CorreoSucursalService.eliminarCorreo.mockResolvedValue({ mensaje: 'Correo eliminado correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await CorreoSucursalController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
