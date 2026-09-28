jest.mock('../daos/CasaFarmaceuticaDAO');

const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const CasaFarmaceuticaService = require('./CasaFarmaceuticaService');

describe('CasaFarmaceuticaService', () => {
  describe('obtenerProveedoresVinculados', () => {
    it('devuelve los proveedores vinculados a una casa existente', async () => {
      const proveedores = [
        { id_proveedor: 1, nombre: 'Proveedor Uno', activo: true },
        { id_proveedor: 2, nombre: 'Proveedor Dos', activo: false },
      ];
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue({ id_casa: 5, nombre: 'Casa X' });
      CasaFarmaceuticaDAO.obtenerProveedoresVinculados.mockResolvedValue(proveedores);

      const resultado = await CasaFarmaceuticaService.obtenerProveedoresVinculados(5);

      expect(CasaFarmaceuticaDAO.obtenerPorId).toHaveBeenCalledWith(5);
      expect(CasaFarmaceuticaDAO.obtenerProveedoresVinculados).toHaveBeenCalledWith(5);
      expect(resultado).toEqual(proveedores);
    });

    it('rechaza con 404 si la casa no existe, sin consultar proveedores', async () => {
      CasaFarmaceuticaDAO.obtenerPorId.mockResolvedValue(null);

      await expect(
        CasaFarmaceuticaService.obtenerProveedoresVinculados(999),
      ).rejects.toMatchObject({
        message: 'Casa farmacéutica no encontrada',
        status: 404,
      });
      expect(CasaFarmaceuticaDAO.obtenerProveedoresVinculados).not.toHaveBeenCalled();
    });
  });
});
