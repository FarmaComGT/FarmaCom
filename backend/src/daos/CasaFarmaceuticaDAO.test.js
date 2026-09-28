jest.mock('../database/db');

const pool = require('../database/db');
const CasaFarmaceuticaDAO = require('./CasaFarmaceuticaDAO');

describe('CasaFarmaceuticaDAO', () => {
  it('obtiene los proveedores vinculados a una casa', async () => {
    const filas = [{ id_proveedor: 1, nombre: 'Proveedor Uno', activo: true }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CasaFarmaceuticaDAO.obtenerProveedoresVinculados(1)).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN casa_proveedor'),
      [1],
    );
  });
});
