jest.mock('../daos/TelefonoSucursalDAO');
jest.mock('../daos/SucursalDAO');

const TelefonoSucursalDAO = require('../daos/TelefonoSucursalDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const TelefonoSucursalService = require('./TelefonoSucursalService');

describe('TelefonoSucursalService', () => {
  describe('crearTelefono', () => {
    it('crea el teléfono cuando la sucursal existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1 });
      TelefonoSucursalDAO.crear.mockResolvedValue({ id_telefono_sucursal: 1, numero: '123' });

      await expect(
        TelefonoSucursalService.crearTelefono({ id_sucursal: 1, numero: '123' }),
      ).resolves.toEqual({ id_telefono_sucursal: 1, numero: '123' });
    });

    it('rechaza con 404 si la sucursal no existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        TelefonoSucursalService.crearTelefono({ id_sucursal: 99, numero: '123' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(TelefonoSucursalDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorSucursal', () => {
    it('rechaza con 404 si la sucursal no existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(TelefonoSucursalService.obtenerPorSucursal(99)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si el teléfono no existe', async () => {
      TelefonoSucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(TelefonoSucursalService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarTelefono', () => {
    it('rechaza con 404 si el teléfono a actualizar no existe', async () => {
      TelefonoSucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        TelefonoSucursalService.actualizarTelefono(99, { numero: '456' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(TelefonoSucursalDAO.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('eliminarTelefono', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      TelefonoSucursalDAO.eliminar.mockResolvedValue(null);

      await expect(TelefonoSucursalService.eliminarTelefono(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
