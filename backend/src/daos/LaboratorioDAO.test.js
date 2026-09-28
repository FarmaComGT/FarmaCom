jest.mock('../database/db');

const pool = require('../database/db');
const LaboratorioDAO = require('./LaboratorioDAO');

describe('LaboratorioDAO', () => {
  it('lista solo los laboratorios activos, ordenados por nombre', async () => {
    const filas = [{ id_laboratorio: 1, nombre_laboratorio: 'Laboratorio Central' }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(LaboratorioDAO.listarActivos()).resolves.toEqual(filas);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE activo = TRUE'));
  });
});
