jest.mock('../services/ClienteContactoService');

const ClienteContactoService = require('../services/ClienteContactoService');
const ClienteContactoController = require('./ClienteContactoController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ClienteContactoController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('teléfonos', () => {
    it('responde 200 con los teléfonos del cliente', async () => {
      ClienteContactoService.listarTelefonos.mockResolvedValue([{ id_telefono: 1 }]);
      const res = mockResponse();

      await ClienteContactoController.obtenerTelefonos({ params: { id: '3' } }, res);

      expect(ClienteContactoService.listarTelefonos).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_telefono: 1 }]);
    });

    it('responde 201 al crear un teléfono', async () => {
      ClienteContactoService.agregarTelefono.mockResolvedValue({ id_telefono: 1, numero: '55551234' });
      const res = mockResponse();

      await ClienteContactoController.crearTelefono(
        { params: { id: '3' }, body: { numero: '55551234' } },
        res,
      );

      expect(ClienteContactoService.agregarTelefono).toHaveBeenCalledWith(3, '55551234');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('actualiza un teléfono usando el cliente y el id de la ruta', async () => {
      ClienteContactoService.actualizarTelefono.mockResolvedValue({ id_telefono: 2 });
      const res = mockResponse();

      await ClienteContactoController.actualizarTelefono(
        { params: { id: '3', id_telefono: '2' }, body: { numero: '55559999' } },
        res,
      );

      expect(ClienteContactoService.actualizarTelefono).toHaveBeenCalledWith(3, 2, '55559999');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('elimina un teléfono del cliente', async () => {
      ClienteContactoService.eliminarTelefono.mockResolvedValue({ mensaje: 'Teléfono eliminado correctamente' });
      const res = mockResponse();

      await ClienteContactoController.eliminarTelefono({ params: { id: '3', id_telefono: '2' } }, res);

      expect(ClienteContactoService.eliminarTelefono).toHaveBeenCalledWith(3, 2);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Teléfono eliminado correctamente' });
    });

    it('envía al middleware el error del servicio', async () => {
      const error = Object.assign(new Error('El cliente ya tiene registrado ese teléfono'), { statusCode: 409 });
      ClienteContactoService.agregarTelefono.mockRejectedValue(error);
      const res = mockResponse();
      const next = jest.fn();

      await ClienteContactoController.crearTelefono(
        { params: { id: '3' }, body: { numero: '55551234' } },
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('correos', () => {
    it('responde 200 con los correos del cliente', async () => {
      ClienteContactoService.listarCorreos.mockResolvedValue([{ id_email: 1 }]);
      const res = mockResponse();

      await ClienteContactoController.obtenerCorreos({ params: { id: '3' } }, res);

      expect(ClienteContactoService.listarCorreos).toHaveBeenCalledWith(3);
      expect(res.json).toHaveBeenCalledWith([{ id_email: 1 }]);
    });

    it('responde 201 al crear un correo', async () => {
      ClienteContactoService.agregarCorreo.mockResolvedValue({ id_email: 1 });
      const res = mockResponse();

      await ClienteContactoController.crearCorreo(
        { params: { id: '3' }, body: { correo: 'ana@farmacom.test' } },
        res,
      );

      expect(ClienteContactoService.agregarCorreo).toHaveBeenCalledWith(3, 'ana@farmacom.test');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('actualiza un correo usando el cliente y el id de la ruta', async () => {
      ClienteContactoService.actualizarCorreo.mockResolvedValue({ id_email: 4 });
      const res = mockResponse();

      await ClienteContactoController.actualizarCorreo(
        { params: { id: '3', id_email: '4' }, body: { correo: 'nuevo@farmacom.test' } },
        res,
      );

      expect(ClienteContactoService.actualizarCorreo).toHaveBeenCalledWith(3, 4, 'nuevo@farmacom.test');
    });

    it('elimina un correo del cliente', async () => {
      ClienteContactoService.eliminarCorreo.mockResolvedValue({ mensaje: 'Correo eliminado correctamente' });
      const res = mockResponse();

      await ClienteContactoController.eliminarCorreo({ params: { id: '3', id_email: '4' } }, res);

      expect(ClienteContactoService.eliminarCorreo).toHaveBeenCalledWith(3, 4);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Correo eliminado correctamente' });
    });
  });
});
