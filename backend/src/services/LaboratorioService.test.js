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

  it('rechaza crear un laboratorio con un nombre que ya existe', async () => {
    LaboratorioDAO.obtenerPorNombre.mockResolvedValue({ id_laboratorio: 1 });

    await expect(LaboratorioService.crear({ nombre_laboratorio: 'Central' }))
      .rejects.toMatchObject({ status: 409, message: 'Ya existe un laboratorio con ese nombre' });
    expect(LaboratorioDAO.crear).not.toHaveBeenCalled();
  });

  it('trata un laboratorio inactivo como inexistente al editar', async () => {
    LaboratorioDAO.obtenerPorId.mockResolvedValue({ id_laboratorio: 1, nombre_laboratorio: 'Central', activo: false });

    await expect(LaboratorioService.actualizar(1, { nombre_laboratorio: 'Central' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('no busca duplicados si solo cambia el uso de mayúsculas del nombre', async () => {
    const datos = { id_ciudad: 2, nombre_laboratorio: 'CENTRAL', direccion: 'Zona 1' };
    LaboratorioDAO.obtenerPorId.mockResolvedValue({ id_laboratorio: 1, nombre_laboratorio: 'Central', activo: true });
    LaboratorioDAO.actualizar.mockResolvedValue({ id_laboratorio: 1, ...datos });

    await expect(LaboratorioService.actualizar(1, datos)).resolves.toMatchObject({ nombre_laboratorio: 'CENTRAL' });
    expect(LaboratorioDAO.obtenerPorNombre).not.toHaveBeenCalled();
  });

  it('rechaza renombrar con el nombre de otro laboratorio', async () => {
    LaboratorioDAO.obtenerPorId.mockResolvedValue({ id_laboratorio: 1, nombre_laboratorio: 'Central', activo: true });
    LaboratorioDAO.obtenerPorNombre.mockResolvedValue({ id_laboratorio: 2 });

    await expect(LaboratorioService.actualizar(1, { nombre_laboratorio: 'Norte' }))
      .rejects.toMatchObject({ status: 409 });
    expect(LaboratorioDAO.actualizar).not.toHaveBeenCalled();
  });

  it('permite renombrar cuando el nombre está libre', async () => {
    const datos = { id_ciudad: 2, nombre_laboratorio: 'Sur', direccion: 'Zona 12' };
    LaboratorioDAO.obtenerPorId.mockResolvedValue({ id_laboratorio: 1, nombre_laboratorio: 'Central', activo: true });
    LaboratorioDAO.obtenerPorNombre.mockResolvedValue(null);
    LaboratorioDAO.actualizar.mockResolvedValue({ id_laboratorio: 1, ...datos });

    await expect(LaboratorioService.actualizar(1, datos)).resolves.toEqual({ id_laboratorio: 1, ...datos });
    expect(LaboratorioDAO.actualizar).toHaveBeenCalledWith(1, datos);
  });

  it('responde 404 si el laboratorio se desactivó durante la edición', async () => {
    LaboratorioDAO.obtenerPorId.mockResolvedValue({ id_laboratorio: 1, nombre_laboratorio: 'Central', activo: true });
    LaboratorioDAO.actualizar.mockResolvedValue(null);

    await expect(LaboratorioService.actualizar(1, { nombre_laboratorio: 'Central' }))
      .rejects.toMatchObject({ status: 404 });
  });
});
