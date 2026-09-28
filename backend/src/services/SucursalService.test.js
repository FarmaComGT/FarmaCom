jest.mock('../daos/SucursalDAO');

const SucursalDAO = require('../daos/SucursalDAO');
const SucursalService = require('./SucursalService');

describe('SucursalService', () => {
  describe('crearSucursal', () => {
    it('crea la sucursal cuando el nombre no está repetido', async () => {
      SucursalDAO.obtenerPorNombre.mockResolvedValue(null);
      SucursalDAO.crear.mockResolvedValue({ id_sucursal: 1, nombre_sucursal: 'Central' });

      await expect(
        SucursalService.crearSucursal({ id_ciudad: 1, nombre_sucursal: 'Central', direccion: 'Z1' }),
      ).resolves.toEqual({ id_sucursal: 1, nombre_sucursal: 'Central' });
    });

    it('rechaza con 409 si ya existe una sucursal con ese nombre', async () => {
      SucursalDAO.obtenerPorNombre.mockResolvedValue({ id_sucursal: 2 });

      await expect(
        SucursalService.crearSucursal({ nombre_sucursal: 'Central' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(SucursalDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 cuando no existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(SucursalService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarSucursal', () => {
    it('rechaza con 404 si la sucursal no existe', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        SucursalService.actualizarSucursal(99, { nombre_sucursal: 'X' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el nuevo nombre ya pertenece a otra sucursal', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1, nombre_sucursal: 'Central' });
      SucursalDAO.obtenerPorNombre.mockResolvedValue({ id_sucursal: 2, nombre_sucursal: 'Norte' });

      await expect(
        SucursalService.actualizarSucursal(1, { nombre_sucursal: 'Norte' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(SucursalDAO.actualizar).not.toHaveBeenCalled();
    });

    it('no valida duplicidad si el nombre no cambia', async () => {
      SucursalDAO.obtenerPorId.mockResolvedValue({ id_sucursal: 1, nombre_sucursal: 'Central' });
      SucursalDAO.actualizar.mockResolvedValue({ id_sucursal: 1, nombre_sucursal: 'Central' });

      await SucursalService.actualizarSucursal(1, { nombre_sucursal: 'Central' });

      expect(SucursalDAO.obtenerPorNombre).not.toHaveBeenCalled();
    });
  });

  describe('eliminarSucursal', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      SucursalDAO.eliminar.mockResolvedValue(null);

      await expect(SucursalService.eliminarSucursal(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
