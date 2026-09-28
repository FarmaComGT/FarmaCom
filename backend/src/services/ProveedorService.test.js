jest.mock('../daos/ProveedorDAO');

const ProveedorDAO = require('../daos/ProveedorDAO');
const ProveedorService = require('./ProveedorService');

describe('ProveedorService', () => {
  describe('crearProveedor', () => {
    it('crea el proveedor cuando el nombre no está repetido', async () => {
      ProveedorDAO.obtenerPorNombre.mockResolvedValue(null);
      ProveedorDAO.crear.mockResolvedValue({ id_proveedor: 1, nombre: 'ABC' });

      await expect(ProveedorService.crearProveedor({ nombre: 'ABC' })).resolves.toEqual({
        id_proveedor: 1,
        nombre: 'ABC',
      });
    });

    it('rechaza con 409 si ya existe un proveedor con ese nombre', async () => {
      ProveedorDAO.obtenerPorNombre.mockResolvedValue({ id_proveedor: 2 });

      await expect(ProveedorService.crearProveedor({ nombre: 'ABC' })).rejects.toMatchObject({
        status: 409,
      });
      expect(ProveedorDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 cuando no existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProveedorService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarProveedor', () => {
    it('rechaza con 404 si el proveedor no existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        ProveedorService.actualizarProveedor(99, { nombre: 'X' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el nuevo nombre ya pertenece a otro proveedor', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1, nombre: 'ABC' });
      ProveedorDAO.obtenerPorNombre.mockResolvedValue({ id_proveedor: 2, nombre: 'XYZ' });

      await expect(
        ProveedorService.actualizarProveedor(1, { nombre: 'XYZ' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(ProveedorDAO.actualizar).not.toHaveBeenCalled();
    });

    it('actualiza cuando no hay conflicto de nombre', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1, nombre: 'ABC' });
      ProveedorDAO.obtenerPorNombre.mockResolvedValue(null);
      ProveedorDAO.actualizar.mockResolvedValue({ id_proveedor: 1, nombre: 'XYZ' });

      await expect(
        ProveedorService.actualizarProveedor(1, { nombre: 'XYZ' }),
      ).resolves.toEqual({ id_proveedor: 1, nombre: 'XYZ' });
    });
  });

  describe('cambiarEstado', () => {
    it('rechaza con 404 si el proveedor no existe', async () => {
      ProveedorDAO.obtenerPorId.mockResolvedValue(null);

      await expect(ProveedorService.cambiarEstado(99, false)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('eliminarProveedor', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      ProveedorDAO.eliminar.mockResolvedValue(null);

      await expect(ProveedorService.eliminarProveedor(99)).rejects.toMatchObject({ status: 404 });
    });

    it('elimina cuando existe', async () => {
      ProveedorDAO.eliminar.mockResolvedValue({ id_proveedor: 1 });

      await expect(ProveedorService.eliminarProveedor(1)).resolves.toEqual({
        mensaje: 'Proveedor eliminado correctamente',
      });
    });
  });
});
