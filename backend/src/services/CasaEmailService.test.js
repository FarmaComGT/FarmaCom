jest.mock('../daos/CasaEmailDAO');
jest.mock('../daos/CasaFarmaceuticaDAO');

const CasaEmailDAO = require('../daos/CasaEmailDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const CasaEmailService = require('./CasaEmailService');

describe('CasaEmailService', () => {
  describe('crearEmail', () => {
    it('crea el correo cuando la casa existe y el correo no está repetido', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1 });
      CasaEmailDAO.obtenerPorCorreo.mockResolvedValue(null);
      CasaEmailDAO.crear.mockResolvedValue({ id_email: 1, id_casa: 1, correo: 'a@b.com' });

      await expect(
        CasaEmailService.crearEmail({ id_casa: 1, correo: 'a@b.com' }),
      ).resolves.toEqual({ id_email: 1, id_casa: 1, correo: 'a@b.com' });
    });

    it('rechaza con 404 si la casa no existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CasaEmailService.crearEmail({ id_casa: 99, correo: 'a@b.com' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(CasaEmailDAO.crear).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el correo ya está registrado', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1 });
      CasaEmailDAO.obtenerPorCorreo.mockResolvedValue({ id_email: 5 });

      await expect(
        CasaEmailService.crearEmail({ id_casa: 1, correo: 'a@b.com' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(CasaEmailDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorCasa', () => {
    it('devuelve los correos cuando la casa existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1 });
      CasaEmailDAO.obtenerPorCasa.mockResolvedValue([{ id_email: 1 }]);

      await expect(CasaEmailService.obtenerPorCasa(1)).resolves.toEqual([{ id_email: 1 }]);
    });

    it('rechaza con 404 si la casa no existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CasaEmailService.obtenerPorCasa(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si el correo no existe', async () => {
      CasaEmailDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CasaEmailService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarEmail', () => {
    it('rechaza con 404 si el correo a actualizar no existe', async () => {
      CasaEmailDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CasaEmailService.actualizarEmail(99, { correo: 'x@y.com' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rechaza con 409 si el nuevo correo ya pertenece a otro registro', async () => {
      CasaEmailDAO.obtenerPorId.mockResolvedValue({ id_email: 1, correo: 'viejo@b.com' });
      CasaEmailDAO.obtenerPorCorreo.mockResolvedValue({ id_email: 2 });

      await expect(
        CasaEmailService.actualizarEmail(1, { correo: 'nuevo@b.com' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(CasaEmailDAO.actualizar).not.toHaveBeenCalled();
    });

    it('permite mantener el mismo correo sin validar duplicidad', async () => {
      CasaEmailDAO.obtenerPorId.mockResolvedValue({ id_email: 1, correo: 'a@b.com' });
      CasaEmailDAO.actualizar.mockResolvedValue({ id_email: 1, correo: 'a@b.com' });

      await CasaEmailService.actualizarEmail(1, { correo: 'a@b.com' });

      expect(CasaEmailDAO.obtenerPorCorreo).not.toHaveBeenCalled();
    });
  });

  describe('eliminarEmail', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      CasaEmailDAO.eliminar.mockResolvedValue(null);

      await expect(CasaEmailService.eliminarEmail(99)).rejects.toMatchObject({ status: 404 });
    });

    it('elimina cuando existe', async () => {
      CasaEmailDAO.eliminar.mockResolvedValue({ id_email: 1 });

      await expect(CasaEmailService.eliminarEmail(1)).resolves.toEqual({
        mensaje: 'Correo eliminado correctamente',
      });
    });
  });
});
