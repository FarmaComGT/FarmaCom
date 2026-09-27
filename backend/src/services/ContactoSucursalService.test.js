jest.mock('../daos/ContactoSucursalDAO');

const ContactoSucursalDAO = require('../daos/ContactoSucursalDAO');
const ContactoSucursalService = require('./ContactoSucursalService');

describe('ContactoSucursalService', () => {
  it('delega obtenerPorSucursal al DAO', async () => {
    const datos = { telefonos: [], correos: [] };
    ContactoSucursalDAO.obtenerPorSucursal.mockResolvedValue(datos);

    await expect(ContactoSucursalService.obtenerPorSucursal(1)).resolves.toEqual(datos);
  });

  describe('agregarTelefono', () => {
    it('rechaza si el número viene vacío', async () => {
      await expect(ContactoSucursalService.agregarTelefono(1, '   ')).rejects.toThrow(
        'El número es requerido',
      );
      expect(ContactoSucursalDAO.agregarTelefono).not.toHaveBeenCalled();
    });

    it('recorta espacios antes de guardar', async () => {
      ContactoSucursalDAO.agregarTelefono.mockResolvedValue({ id_telefono: 1, numero: '123' });

      await ContactoSucursalService.agregarTelefono(1, '  123  ');

      expect(ContactoSucursalDAO.agregarTelefono).toHaveBeenCalledWith(1, '123');
    });
  });

  describe('eliminarTelefono', () => {
    it('lanza error si no se eliminó nada', async () => {
      ContactoSucursalDAO.eliminarTelefono.mockResolvedValue(null);

      await expect(ContactoSucursalService.eliminarTelefono(1, 5)).rejects.toThrow(
        'Teléfono no encontrado',
      );
    });
  });

  describe('agregarCorreo', () => {
    it('rechaza si el correo viene vacío', async () => {
      await expect(ContactoSucursalService.agregarCorreo(1, '')).rejects.toThrow(
        'El correo es requerido',
      );
      expect(ContactoSucursalDAO.agregarCorreo).not.toHaveBeenCalled();
    });

    it('recorta espacios antes de guardar', async () => {
      ContactoSucursalDAO.agregarCorreo.mockResolvedValue({ id_correo: 1, correo: 'a@b.com' });

      await ContactoSucursalService.agregarCorreo(1, '  a@b.com  ');

      expect(ContactoSucursalDAO.agregarCorreo).toHaveBeenCalledWith(1, 'a@b.com');
    });
  });

  describe('eliminarCorreo', () => {
    it('lanza error si no se eliminó nada', async () => {
      ContactoSucursalDAO.eliminarCorreo.mockResolvedValue(null);

      await expect(ContactoSucursalService.eliminarCorreo(1, 5)).rejects.toThrow(
        'Correo no encontrado',
      );
    });
  });
});
