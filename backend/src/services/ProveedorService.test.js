jest.mock('../daos/ProveedorDAO');

const ProveedorDAO = require('../daos/ProveedorDAO');
const ProveedorService = require('./ProveedorService');

describe('ProveedorService', () => {
  beforeEach(() => {
    ProveedorDAO.ejecutarEnTransaccion.mockImplementation((operacion) => operacion({}));
  });

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
    it('rechaza con 404 si el proveedor no existe', async () => {
      ProveedorDAO.obtenerParaActualizar.mockResolvedValue(null);

      await expect(ProveedorService.eliminarProveedor(99)).rejects.toMatchObject({ status: 404 });
    });

    it('elimina físicamente un proveedor que nunca se ha utilizado', async () => {
      ProveedorDAO.obtenerParaActualizar.mockResolvedValue({ id_proveedor: 1, activo: true });
      ProveedorDAO.obtenerUso.mockResolvedValue({ productos: 0, lotes: 0, sucursales: 0 });
      ProveedorDAO.eliminar.mockResolvedValue({ id_proveedor: 1 });

      await expect(ProveedorService.eliminarProveedor(1)).resolves.toEqual({
        accion: 'eliminado',
        mensaje: 'Proveedor eliminado correctamente',
        proveedor: { id_proveedor: 1 },
        uso: { productos: 0, lotes: 0, sucursales: 0 },
      });
    });

    it('desactiva el proveedor si tiene productos, lotes o historial', async () => {
      ProveedorDAO.obtenerParaActualizar.mockResolvedValue({ id_proveedor: 1, activo: true });
      ProveedorDAO.obtenerUso.mockResolvedValue({ productos: 1, lotes: 4, sucursales: 2 });
      ProveedorDAO.cambiarActivo.mockResolvedValue({ id_proveedor: 1, activo: false });

      await expect(ProveedorService.eliminarProveedor(1)).resolves.toMatchObject({
        accion: 'desactivado',
        proveedor: { id_proveedor: 1, activo: false },
        uso: { productos: 1, lotes: 4, sucursales: 2 },
      });
      expect(ProveedorDAO.eliminar).not.toHaveBeenCalled();
      expect(ProveedorDAO.cambiarActivo).toHaveBeenCalledWith(1, false, {});
    });

    it('desactiva como respaldo ante una violación de integridad', async () => {
      const errorFk = new Error('foreign key');
      errorFk.code = '23503';
      ProveedorDAO.ejecutarEnTransaccion.mockRejectedValue(errorFk);
      ProveedorDAO.obtenerPorId.mockResolvedValue({ id_proveedor: 1, activo: true });
      ProveedorDAO.obtenerUso.mockResolvedValue({ productos: 0, lotes: 1, sucursales: 1 });
      ProveedorDAO.cambiarActivo.mockResolvedValue({ id_proveedor: 1, activo: false });

      await expect(ProveedorService.eliminarProveedor(1)).resolves.toMatchObject({
        accion: 'desactivado',
      });
    });
  });
});
