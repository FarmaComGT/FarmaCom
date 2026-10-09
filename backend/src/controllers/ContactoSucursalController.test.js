jest.mock('../services/ContactoSucursalService');

const ContactoSucursalService = require('../services/ContactoSucursalService');
const ContactoSucursalController = require('./ContactoSucursalController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ContactoSucursalController', () => {
  describe('obtener', () => {
    it('responde con los teléfonos y correos de la sucursal', async () => {
      const datos = { telefonos: [], correos: [] };
      ContactoSucursalService.obtenerPorSucursal.mockResolvedValue(datos);

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await ContactoSucursalController.obtener(req, res);

      expect(ContactoSucursalService.obtenerPorSucursal).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(datos);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('responde 500 si el service falla', async () => {
      ContactoSucursalService.obtenerPorSucursal.mockRejectedValue(new Error('Fallo de base de datos'));

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await ContactoSucursalController.obtener(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Fallo de base de datos' });
    });
  });

  describe('agregarTelefono', () => {
    it('responde 201 con el teléfono creado', async () => {
      ContactoSucursalService.agregarTelefono.mockResolvedValue({ id_telefono: 1, numero: '123' });

      const req = { params: { id: '1' }, body: { numero: '123' } };
      const res = mockResponse();

      await ContactoSucursalController.agregarTelefono(req, res);

      expect(ContactoSucursalService.agregarTelefono).toHaveBeenCalledWith(1, '123');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 si el service rechaza el número', async () => {
      ContactoSucursalService.agregarTelefono.mockRejectedValue(new Error('El número es requerido'));

      const req = { params: { id: '1' }, body: {} };
      const res = mockResponse();

      await ContactoSucursalController.agregarTelefono(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'El número es requerido' });
    });
  });

  describe('eliminarTelefono', () => {
    it('responde con el teléfono eliminado', async () => {
      ContactoSucursalService.eliminarTelefono.mockResolvedValue({ id_telefono: 1 });

      const req = { params: { id: '1', idTelefono: '5' } };
      const res = mockResponse();

      await ContactoSucursalController.eliminarTelefono(req, res);

      expect(ContactoSucursalService.eliminarTelefono).toHaveBeenCalledWith(5, 1);
      expect(res.json).toHaveBeenCalledWith({ id_telefono: 1 });
    });

    it('responde 404 si el teléfono no existe', async () => {
      ContactoSucursalService.eliminarTelefono.mockRejectedValue(new Error('Teléfono no encontrado'));

      const req = { params: { id: '1', idTelefono: '99' } };
      const res = mockResponse();

      await ContactoSucursalController.eliminarTelefono(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('agregarCorreo', () => {
    it('responde 201 con el correo creado', async () => {
      ContactoSucursalService.agregarCorreo.mockResolvedValue({ id_correo: 1, correo: 'a@b.com' });

      const req = { params: { id: '1' }, body: { correo: 'a@b.com' } };
      const res = mockResponse();

      await ContactoSucursalController.agregarCorreo(req, res);

      expect(ContactoSucursalService.agregarCorreo).toHaveBeenCalledWith(1, 'a@b.com');
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('eliminarCorreo', () => {
    it('responde 404 si el correo no existe', async () => {
      ContactoSucursalService.eliminarCorreo.mockRejectedValue(new Error('Correo no encontrado'));

      const req = { params: { id: '1', idCorreo: '99' } };
      const res = mockResponse();

      await ContactoSucursalController.eliminarCorreo(req, res);

      expect(ContactoSucursalService.eliminarCorreo).toHaveBeenCalledWith(99, 1);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
