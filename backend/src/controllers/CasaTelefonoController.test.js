jest.mock('../services/CasaTelefonoService');

const CasaTelefonoService = require('../services/CasaTelefonoService');
const CasaTelefonoController = require('./CasaTelefonoController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CasaTelefonoController', () => {
  describe('crear', () => {
    it('responde 201 con el teléfono creado', async () => {
      CasaTelefonoService.crearTelefono.mockResolvedValue({ id_telefono: 1, numero: '123' });

      const req = { params: { id_casa: '1' }, body: { numero: '123' } };
      const res = mockResponse();

      await CasaTelefonoController.crear(req, res);

      expect(CasaTelefonoService.crearTelefono).toHaveBeenCalledWith({ id_casa: 1, numero: '123' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_telefono: 1, numero: '123' });
    });

    it('envía al middleware el error del service (404 casa inexistente)', async () => {
      const error = new Error('La casa farmacéutica no existe');
      error.status = 404;
      CasaTelefonoService.crearTelefono.mockRejectedValue(error);

      const req = { params: { id_casa: '99' }, body: { numero: '123' } };
      const res = mockResponse();
      const next = jest.fn();

      await CasaTelefonoController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorCasa', () => {
    it('responde 200 con los teléfonos de la casa', async () => {
      CasaTelefonoService.obtenerPorCasa.mockResolvedValue([{ id_telefono: 1 }]);

      const req = { params: { id_casa: '1' } };
      const res = mockResponse();

      await CasaTelefonoController.obtenerPorCasa(req, res);

      expect(CasaTelefonoService.obtenerPorCasa).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_telefono: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Teléfono no encontrado');
      error.status = 404;
      CasaTelefonoService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id_telefono: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await CasaTelefonoController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con el teléfono actualizado', async () => {
      CasaTelefonoService.actualizarTelefono.mockResolvedValue({ id_telefono: 1, numero: '456' });

      const req = { params: { id_telefono: '1' }, body: { numero: '456' } };
      const res = mockResponse();

      await CasaTelefonoController.actualizar(req, res);

      expect(CasaTelefonoService.actualizarTelefono).toHaveBeenCalledWith(1, { numero: '456' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      CasaTelefonoService.eliminarTelefono.mockResolvedValue({ mensaje: 'Teléfono eliminado correctamente' });

      const req = { params: { id_telefono: '1' } };
      const res = mockResponse();

      await CasaTelefonoController.eliminar(req, res);

      expect(CasaTelefonoService.eliminarTelefono).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Teléfono eliminado correctamente' });
    });
  });
});
