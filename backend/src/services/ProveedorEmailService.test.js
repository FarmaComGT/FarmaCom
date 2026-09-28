jest.mock('../daos/ProveedorEmailDAO');
jest.mock('../daos/ProveedorDAO');

const ProveedorEmailDAO = require('../daos/ProveedorEmailDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const ProveedorEmailService = require('./ProveedorEmailService');

describe('ProveedorEmailService', () => {
  describe('crearEmail', () => {
    it('crea el correo cuando el proveedor existe y el correo no está repetido', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1 });
      ProveedorEmailDAO.obtenerPorCorreo.mockResolvedValue(null);
      ProveedorEmailDAO.crear.mockResolvedValue({ id_email: 1, id_proveedor: 1, correo: 'a@b.com' });

      await expect(
        ProveedorEmailService.crearEmail({ id_proveedor: 1, correo: 'a@b.com' }),
      ).resolves.toEqual({ id_email: 1, id_proveedor: 1, correo: 'a@b.com' });
    });

    it('rechaza con 404 si el proveedor no existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        ProveedorEmailService.crearEmail({ id_proveedor: 99, correo: 'a@b.com' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(ProveedorEmailDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el correo ya está registrado', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1 });
      ProveedorEmailDAO.obtenerPorCorreo.mockResolvedValue({ id_email: 5 });

      await expect(
        ProveedorEmailService.crearEmail({ id_proveedor: 1, correo: 'a@b.com' }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('obtenerPorProveedor', () => {
    it('rechaza con 404 si el proveedor no existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProveedorEmailService.obtenerPorProveedor(99)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si el correo no existe', async () => {
      ProveedorEmailDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProveedorEmailService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarEmail', () => {
    it('rechaza con 409 si el nuevo correo ya pertenece a otro registro', async () => {
      ProveedorEmailDAO.obtenerPorId.mockResolvedValue({ id_email: 1, correo: 'viejo@b.com' });
      ProveedorEmailDAO.obtenerPorCorreo.mockResolvedValue({ id_email: 2 });

      await expect(
        ProveedorEmailService.actualizarEmail(1, { correo: 'nuevo@b.com' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(ProveedorEmailDAO.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('eliminarEmail', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      ProveedorEmailDAO.eliminar.mockResolvedValue(null);

      await expect(ProveedorEmailService.eliminarEmail(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
