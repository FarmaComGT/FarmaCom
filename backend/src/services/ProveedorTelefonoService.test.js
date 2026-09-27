jest.mock('../daos/ProveedorTelefonoDAO');
jest.mock('../daos/ProveedorDAO');

const ProveedorTelefonoDAO = require('../daos/ProveedorTelefonoDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const ProveedorTelefonoService = require('./ProveedorTelefonoService');

describe('ProveedorTelefonoService', () => {
  describe('crearTelefono', () => {
    it('crea el teléfono cuando el proveedor existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1 });
      ProveedorTelefonoDAO.crear.mockResolvedValue({ id_telefono: 1, id_proveedor: 1, numero: '123' });

      await expect(
        ProveedorTelefonoService.crearTelefono({ id_proveedor: 1, numero: '123' }),
      ).resolves.toEqual({ id_telefono: 1, id_proveedor: 1, numero: '123' });
    });

    it('rechaza con 404 si el proveedor no existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        ProveedorTelefonoService.crearTelefono({ id_proveedor: 99, numero: '123' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(ProveedorTelefonoDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorProveedor', () => {
    it('rechaza con 404 si el proveedor no existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProveedorTelefonoService.obtenerPorProveedor(99)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si el teléfono no existe', async () => {
      ProveedorTelefonoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProveedorTelefonoService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarTelefono', () => {
    it('rechaza con 404 si el teléfono a actualizar no existe', async () => {
      ProveedorTelefonoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        ProveedorTelefonoService.actualizarTelefono(99, { numero: '456' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(ProveedorTelefonoDAO.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('eliminarTelefono', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      ProveedorTelefonoDAO.eliminar.mockResolvedValue(null);

      await expect(ProveedorTelefonoService.eliminarTelefono(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
