jest.mock('../daos/CorreoSucursalDAO');
jest.mock('../daos/SucursalDAO');

const CorreoSucursalDAO = require('../daos/CorreoSucursalDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const CorreoSucursalService = require('./CorreoSucursalService');

describe('CorreoSucursalService', () => {
  describe('crearCorreo', () => {
    it('crea el correo cuando la sucursal existe y no está repetido', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      CorreoSucursalDAO.obtenerPorCorreo.mockResolvedValue(null);
      CorreoSucursalDAO.crear.mockResolvedValue({ id_correo_sucursal: 1, correo: 'a@b.com' });

      await expect(
        CorreoSucursalService.crearCorreo({ id_sucursal: 1, correo: 'a@b.com' }),
      ).resolves.toEqual({ id_correo_sucursal: 1, correo: 'a@b.com' });
    });

    it('rechaza con 404 si la sucursal no existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CorreoSucursalService.crearCorreo({ id_sucursal: 99, correo: 'a@b.com' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(CorreoSucursalDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el correo ya está registrado', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      CorreoSucursalDAO.obtenerPorCorreo.mockResolvedValue({ id_correo_sucursal: 5 });

      await expect(
        CorreoSucursalService.crearCorreo({ id_sucursal: 1, correo: 'a@b.com' }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('obtenerPorSucursal', () => {
    it('rechaza con 404 si la sucursal no existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CorreoSucursalService.obtenerPorSucursal(99)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si el correo no existe', async () => {
      CorreoSucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CorreoSucursalService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarCorreo', () => {
    it('rechaza con 409 si el nuevo correo ya pertenece a otro registro', async () => {
      CorreoSucursalDAO.obtenerPorId.mockResolvedValue({ id_correo_sucursal: 1, correo: 'viejo@b.com' });
      CorreoSucursalDAO.obtenerPorCorreo.mockResolvedValue({ id_correo_sucursal: 2 });

      await expect(
        CorreoSucursalService.actualizarCorreo(1, { correo: 'nuevo@b.com' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(CorreoSucursalDAO.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('eliminarCorreo', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      CorreoSucursalDAO.eliminar.mockResolvedValue(null);

      await expect(CorreoSucursalService.eliminarCorreo(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
