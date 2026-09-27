jest.mock('../daos/CasaTelefonoDAO');
jest.mock('../daos/CasaFarmaceuticaDAO');

const CasaTelefonoDAO = require('../daos/CasaTelefonoDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const CasaTelefonoService = require('./CasaTelefonoService');

describe('CasaTelefonoService', () => {
  describe('crearTelefono', () => {
    it('crea el teléfono cuando la casa existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 1 });
      CasaTelefonoDAO.crear.mockResolvedValue({ id_telefono: 1, id_casa: 1, numero: '123' });

      await expect(
        CasaTelefonoService.crearTelefono({ id_casa: 1, numero: '123' }),
      ).resolves.toEqual({ id_telefono: 1, id_casa: 1, numero: '123' });
    });

    it('rechaza con 404 si la casa no existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CasaTelefonoService.crearTelefono({ id_casa: 99, numero: '123' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(CasaTelefonoDAO.crear).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorCasa', () => {
    it('rechaza con 404 si la casa no existe', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CasaTelefonoService.obtenerPorCasa(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('obtenerPorId', () => {
    it('rechaza con 404 si el teléfono no existe', async () => {
      CasaTelefonoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(CasaTelefonoService.obtenerPorId(99)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('actualizarTelefono', () => {
    it('rechaza con 404 si el teléfono a actualizar no existe', async () => {
      CasaTelefonoDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CasaTelefonoService.actualizarTelefono(99, { numero: '456' }),
      ).rejects.toMatchObject({ status: 404 });
      expect(CasaTelefonoDAO.actualizar).not.toHaveBeenCalled();
    });

    it('actualiza cuando el teléfono existe', async () => {
      CasaTelefonoDAO.obtenerPorId.mockResolvedValue({ id_telefono: 1 });
      CasaTelefonoDAO.actualizar.mockResolvedValue({ id_telefono: 1, numero: '456' });

      await expect(
        CasaTelefonoService.actualizarTelefono(1, { numero: '456' }),
      ).resolves.toEqual({ id_telefono: 1, numero: '456' });
    });
  });

  describe('eliminarTelefono', () => {
    it('rechaza con 404 si no había nada que eliminar', async () => {
      CasaTelefonoDAO.eliminar.mockResolvedValue(null);

      await expect(CasaTelefonoService.eliminarTelefono(99)).rejects.toMatchObject({ status: 404 });
    });
  });
});
