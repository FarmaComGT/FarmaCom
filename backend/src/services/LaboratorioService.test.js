jest.mock('../daos/LaboratorioDAO');

const LaboratorioDAO = require('../daos/LaboratorioDAO');
const LaboratorioService = require('./LaboratorioService');

describe('LaboratorioService', () => {
  it('delega listarActivos al DAO', async () => {
    const laboratorios = [{ id_laboratorio: 1, nombre_laboratorio: 'Central' }];
    LaboratorioDAO.listarActivos.mockResolvedValue(laboratorios);

    await expect(LaboratorioService.listarActivos()).resolves.toEqual(laboratorios);
  });
});
