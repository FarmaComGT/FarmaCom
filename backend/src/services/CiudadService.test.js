jest.mock('../daos/CiudadDAO');

const CiudadDAO = require('../daos/CiudadDAO');
const CiudadService = require('./CiudadService');

describe('CiudadService', () => {
  describe('crearCiudad', () => {
    it('crea la ciudad cuando el nombre no está repetido', async () => {
      CiudadDAO.obtenerPorNombre.mockResolvedValue(null);
      CiudadDAO.crear.mockResolvedValue({ id_ciudad: 1, nombre_ciudad: 'Guatemala' });

      await expect(
        CiudadService.crearCiudad({ nombre_ciudad: 'Guatemala' }),
      ).resolves.toEqual({ id_ciudad: 1, nombre_ciudad: 'Guatemala' });
    });

    it('rechaza con 409 si ya existe una ciudad con ese nombre', async () => {
      CiudadDAO.obtenerPorNombre.mockResolvedValue({ id_ciudad: 2 });

      await expect(
        CiudadService.crearCiudad({ nombre_ciudad: 'Guatemala' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(CiudadDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 cuando no existe', async () => {
      CiudadDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CiudadService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarCiudad', () => {
    it('rechaza con 404 si la ciudad no existe', async () => {
      CiudadDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CiudadService.actualizarCiudad(99, { nombre_ciudad: 'X' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el nuevo nombre ya pertenece a otra ciudad', async () => {
      CiudadDAO.obtenerPorId.mockResolvedValue({ id_ciudad: 1, nombre_ciudad: 'Guatemala' });
      CiudadDAO.obtenerPorNombre.mockResolvedValue({ id_ciudad: 2, nombre_ciudad: 'Antigua' });

      await expect(
        CiudadService.actualizarCiudad(1, { nombre_ciudad: 'Antigua' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(CiudadDAO.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('eliminarCiudad', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      CiudadDAO.eliminar.mockResolvedValue(null);

      await expect(CiudadService.eliminarCiudad(99)).rejects.toMatchObject({ status: 404 });
    });

    it('elimina cuando existe', async () => {
      CiudadDAO.eliminar.mockResolvedValue({ id_ciudad: 1 });

      await expect(CiudadService.eliminarCiudad(1)).resolves.toEqual({
        mensaje: 'Ciudad eliminada correctamente',
      });
    });

    it('traduce la violación de FK (23503) a un 409 legible', async () => {
      const errorFk = new Error('violates foreign key constraint');
      errorFk.code = '23503';
      CiudadDAO.eliminar.mockRejectedValue(errorFk);

      await expect(CiudadService.eliminarCiudad(1)).rejects.toMatchObject({
        message: 'No se puede eliminar una ciudad asociada a sucursales',
        status: 409,
      });
    });
  });
});
