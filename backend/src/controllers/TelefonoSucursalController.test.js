jest.mock('../services/TelefonoSucursalService');

const TelefonoSucursalService = require('../services/TelefonoSucursalService');
const TelefonoSucursalController = require('./TelefonoSucursalController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('TelefonoSucursalController', () => {
  describe('crear', () => {
    it('responde 201 con el teléfono creado', async () => {
      TelefonoSucursalService.crearTelefono.mockResolvedValue({ id_telefono_sucursal: 1, numero: '123' });

      const req = { params: { id_sucursal: '1' }, body: { numero: '123' } };
      const res = mockResponse();

      await TelefonoSucursalController.crear(req, res);

      expect(TelefonoSucursalService.crearTelefono).toHaveBeenCalledWith({ id_sucursal: 1, numero: '123' });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('envía al middleware el error del service (404 sucursal inexistente)', async () => {
      const error = new Error('La sucursal no existe');
      error.status = 404;
      TelefonoSucursalService.crearTelefono.mockRejectedValue(error);

      const req = { params: { id_sucursal: '99' }, body: { numero: '123' } };
      const res = mockResponse();
      const next = jest.fn();

      await TelefonoSucursalController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorSucursal', () => {
    it('responde 200 con los teléfonos de la sucursal', async () => {
      TelefonoSucursalService.obtenerPorSucursal.mockResolvedValue([{ id_telefono_sucursal: 1 }]);

      const req = { params: { id_sucursal: '1' } };
      const res = mockResponse();

      await TelefonoSucursalController.obtenerPorSucursal(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorId', () => {
    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Teléfono no encontrado');
      error.status = 404;
      TelefonoSucursalService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await TelefonoSucursalController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el teléfono actualizado', async () => {
      TelefonoSucursalService.actualizarTelefono.mockResolvedValue({ id_telefono_sucursal: 1, numero: '456' });

      const req = { params: { id: '1' }, body: { numero: '456' } };
      const res = mockResponse();

      await TelefonoSucursalController.actualizar(req, res);

      expect(TelefonoSucursalService.actualizarTelefono).toHaveBeenCalledWith(1, { numero: '456' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      TelefonoSucursalService.eliminarTelefono.mockResolvedValue({ mensaje: 'Teléfono eliminado correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await TelefonoSucursalController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
