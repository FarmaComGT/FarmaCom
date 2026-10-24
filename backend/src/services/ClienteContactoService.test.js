jest.mock('../daos/ClienteDAO');
jest.mock('../daos/ClienteTelefonoDAO');
jest.mock('../daos/ClienteEmailDAO');

const ClienteDAO = require('../daos/ClienteDAO');
const ClienteTelefonoDAO = require('../daos/ClienteTelefonoDAO');
const ClienteEmailDAO = require('../daos/ClienteEmailDAO');
const ClienteContactoService = require('./ClienteContactoService');

describe('ClienteContactoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ClienteDAO.obtenerPorId.mockResolvedValue({ id_cliente: 3, nombre_cliente: 'Ana' });
  });

  describe('teléfonos', () => {
    it('lista los teléfonos de un cliente existente', async () => {
      ClienteTelefonoDAO.obtenerPorCliente.mockResolvedValue([{ id_telefono: 1 }]);

      await expect(ClienteContactoService.listarTelefonos(3)).resolves.toEqual([{ id_telefono: 1 }]);
      expect(ClienteTelefonoDAO.obtenerPorCliente).toHaveBeenCalledWith(3);
    });

    it('responde 404 si el cliente no existe', async () => {
      ClienteDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ClienteContactoService.listarTelefonos(99)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Cliente no encontrado',
      });
      expect(ClienteTelefonoDAO.obtenerPorCliente).not.toHaveBeenCalled();
    });

    it('normaliza el número antes de guardarlo', async () => {
      ClienteTelefonoDAO.obtenerPorClienteYNumero.mockResolvedValue(null);
      ClienteTelefonoDAO.crear.mockResolvedValue({ id_telefono: 1, id_cliente: 3, numero: '55551234' });

      await ClienteContactoService.agregarTelefono(3, ' 5555-1234 ');

      expect(ClienteTelefonoDAO.obtenerPorClienteYNumero).toHaveBeenCalledWith(3, '55551234');
      expect(ClienteTelefonoDAO.crear).toHaveBeenCalledWith({ id_cliente: 3, numero: '55551234' });
    });

    it('rechaza un número con formato inválido', async () => {
      await expect(ClienteContactoService.agregarTelefono(3, '123')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(ClienteTelefonoDAO.crear).not.toHaveBeenCalled();
    });

    it('detecta un número duplicado en el mismo cliente', async () => {
      ClienteTelefonoDAO.obtenerPorClienteYNumero.mockResolvedValue({ id_telefono: 7, numero: '55551234' });

      await expect(ClienteContactoService.agregarTelefono(3, '5555 1234')).rejects.toMatchObject({
        statusCode: 409,
        message: 'El cliente ya tiene registrado ese teléfono',
      });
      expect(ClienteTelefonoDAO.crear).not.toHaveBeenCalled();
    });

    it('convierte una violación de unicidad de la base en 409', async () => {
      ClienteTelefonoDAO.obtenerPorClienteYNumero.mockResolvedValue(null);
      ClienteTelefonoDAO.crear.mockRejectedValue(Object.assign(new Error('duplicado'), { code: '23505' }));

      await expect(ClienteContactoService.agregarTelefono(3, '55551234')).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('propaga otros errores de la base', async () => {
      ClienteTelefonoDAO.obtenerPorClienteYNumero.mockResolvedValue(null);
      ClienteTelefonoDAO.crear.mockRejectedValue(new Error('conexión perdida'));

      await expect(ClienteContactoService.agregarTelefono(3, '55551234')).rejects.toThrow('conexión perdida');
    });

    it('actualiza un teléfono del cliente', async () => {
      ClienteTelefonoDAO.obtenerPorId.mockResolvedValue({ id_telefono: 1, id_cliente: 3, numero: '55551234' });
      ClienteTelefonoDAO.obtenerPorClienteYNumero.mockResolvedValue(null);
      ClienteTelefonoDAO.actualizar.mockResolvedValue({ id_telefono: 1, numero: '55559999' });

      await expect(
        ClienteContactoService.actualizarTelefono(3, 1, '5555-9999'),
      ).resolves.toEqual({ id_telefono: 1, numero: '55559999' });
      expect(ClienteTelefonoDAO.actualizar).toHaveBeenCalledWith(1, { numero: '55559999' });
    });

    it('no consulta duplicados si el número no cambia', async () => {
      const existente = { id_telefono: 1, id_cliente: 3, numero: '55551234' };
      ClienteTelefonoDAO.obtenerPorId.mockResolvedValue(existente);

      await expect(ClienteContactoService.actualizarTelefono(3, 1, '5555 1234')).resolves.toEqual(existente);
      expect(ClienteTelefonoDAO.obtenerPorClienteYNumero).not.toHaveBeenCalled();
      expect(ClienteTelefonoDAO.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza actualizar a un número que ya tiene otro teléfono del cliente', async () => {
      ClienteTelefonoDAO.obtenerPorId.mockResolvedValue({ id_telefono: 1, id_cliente: 3, numero: '55551234' });
      ClienteTelefonoDAO.obtenerPorClienteYNumero.mockResolvedValue({ id_telefono: 2, numero: '55559999' });

      await expect(ClienteContactoService.actualizarTelefono(3, 1, '55559999')).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('responde 404 al actualizar un teléfono de otro cliente', async () => {
      ClienteTelefonoDAO.obtenerPorId.mockResolvedValue({ id_telefono: 1, id_cliente: 8, numero: '55551234' });

      await expect(ClienteContactoService.actualizarTelefono(3, 1, '55559999')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Teléfono no encontrado',
      });
      expect(ClienteTelefonoDAO.actualizar).not.toHaveBeenCalled();
    });

    it('elimina un teléfono del cliente', async () => {
      ClienteTelefonoDAO.obtenerPorId.mockResolvedValue({ id_telefono: 1, id_cliente: 3 });
      ClienteTelefonoDAO.eliminar.mockResolvedValue({ id_telefono: 1 });

      await expect(ClienteContactoService.eliminarTelefono(3, 1)).resolves.toEqual({
        mensaje: 'Teléfono eliminado correctamente',
      });
      expect(ClienteTelefonoDAO.eliminar).toHaveBeenCalledWith(1);
    });

    it('responde 404 al eliminar un teléfono inexistente', async () => {
      ClienteTelefonoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ClienteContactoService.eliminarTelefono(3, 99)).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(ClienteTelefonoDAO.eliminar).not.toHaveBeenCalled();
    });
  });

  describe('correos', () => {
    it('lista los correos de un cliente existente', async () => {
      ClienteEmailDAO.obtenerPorCliente.mockResolvedValue([{ id_email: 1 }]);

      await expect(ClienteContactoService.listarCorreos(3)).resolves.toEqual([{ id_email: 1 }]);
    });

    it('guarda el correo en minúsculas', async () => {
      ClienteEmailDAO.obtenerPorClienteYCorreo.mockResolvedValue(null);
      ClienteEmailDAO.crear.mockResolvedValue({ id_email: 1, correo: 'ana@farmacom.test' });

      await ClienteContactoService.agregarCorreo(3, ' Ana@FarmaCom.Test ');

      expect(ClienteEmailDAO.crear).toHaveBeenCalledWith({ id_cliente: 3, correo: 'ana@farmacom.test' });
    });

    it('rechaza un correo con formato inválido', async () => {
      await expect(ClienteContactoService.agregarCorreo(3, 'ana@farmacom')).rejects.toMatchObject({
        statusCode: 400,
        message: 'El correo no tiene un formato válido',
      });
    });

    it('detecta un correo duplicado en el mismo cliente', async () => {
      ClienteEmailDAO.obtenerPorClienteYCorreo.mockResolvedValue({ id_email: 4, correo: 'ana@farmacom.test' });

      await expect(ClienteContactoService.agregarCorreo(3, 'ANA@farmacom.test')).rejects.toMatchObject({
        statusCode: 409,
        message: 'El cliente ya tiene registrado ese correo',
      });
    });

    it('permite actualizar el correo cuando el único coincidente es el mismo registro', async () => {
      ClienteEmailDAO.obtenerPorId.mockResolvedValue({ id_email: 4, id_cliente: 3, correo: 'ana@farmacom.test' });
      ClienteEmailDAO.obtenerPorClienteYCorreo.mockResolvedValue({ id_email: 4 });
      ClienteEmailDAO.actualizar.mockResolvedValue({ id_email: 4, correo: 'ana.nueva@farmacom.test' });

      await expect(
        ClienteContactoService.actualizarCorreo(3, 4, 'ana.nueva@farmacom.test'),
      ).resolves.toEqual({ id_email: 4, correo: 'ana.nueva@farmacom.test' });
    });

    it('elimina un correo del cliente', async () => {
      ClienteEmailDAO.obtenerPorId.mockResolvedValue({ id_email: 4, id_cliente: 3 });

      await expect(ClienteContactoService.eliminarCorreo(3, 4)).resolves.toEqual({
        mensaje: 'Correo eliminado correctamente',
      });
    });
  });
});
