jest.mock('../daos/LaboratorioDAO');

const LaboratorioDAO = require('../daos/LaboratorioDAO');
const LaboratorioService = require('./LaboratorioService');

describe('LaboratorioService', () => {
  it('delega listarActivos al DAO', async () => {
    const laboratorios = [{ id_laboratorio: 1, nombre_laboratorio: 'Central' }];
    LaboratorioDAO.listarActivos.mockResolvedValue(laboratorios);

    await expect(LaboratorioService.listarActivos()).resolves.toEqual(laboratorios);
  });

  it('crea un laboratorio cuando el nombre está disponible', async () => {
    const datos = { id_ciudad: 2, nombre_laboratorio: 'Norte', direccion: 'Zona 17' };
    LaboratorioDAO.obtenerPorNombre.mockResolvedValue(null);
    LaboratorioDAO.crear.mockResolvedValue({ id_laboratorio: 3, ...datos });

    await expect(LaboratorioService.crear(datos)).resolves.toEqual({ id_laboratorio: 3, ...datos });
  });

  it('rechaza editar un laboratorio inexistente', async () => {
    LaboratorioDAO.obtenerPorId.mockResolvedValue(null);

    await expect(LaboratorioService.actualizar(99, {
      id_ciudad: 2, nombre_laboratorio: 'Norte', direccion: 'Zona 17',
    })).rejects.toMatchObject({ status: 404 });
  });
});
