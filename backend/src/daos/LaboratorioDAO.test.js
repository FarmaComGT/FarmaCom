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

  it('obtiene un laboratorio por id o null si no existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_laboratorio: 1, activo: true }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(LaboratorioDAO.obtenerPorId(1)).resolves.toEqual({ id_laboratorio: 1, activo: true });
    await expect(LaboratorioDAO.obtenerPorId(99)).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id_laboratorio = $1'), [1]);
  });

  it('busca por nombre sin distinguir mayúsculas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_laboratorio: 2 }] }).mockResolvedValueOnce({ rows: [] });

    await expect(LaboratorioDAO.obtenerPorNombre('NORTE')).resolves.toEqual({ id_laboratorio: 2 });
    await expect(LaboratorioDAO.obtenerPorNombre('Otro')).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(nombre_laboratorio) = LOWER($1)'),
      ['NORTE'],
    );
  });

  it('crea un laboratorio', async () => {
    const fila = { id_laboratorio: 3, id_ciudad: 2, nombre_laboratorio: 'Norte', direccion: 'Zona 17', activo: true };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(LaboratorioDAO.crear({ id_ciudad: 2, nombre_laboratorio: 'Norte', direccion: 'Zona 17' }))
      .resolves.toEqual(fila);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO laboratorio'), [2, 'Norte', 'Zona 17']);
  });

  it('actualiza solo laboratorios activos y devuelve null si no hubo cambios', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id_laboratorio: 3 }] }).mockResolvedValueOnce({ rows: [] });
    const datos = { id_ciudad: 2, nombre_laboratorio: 'Norte', direccion: 'Zona 18' };

    await expect(LaboratorioDAO.actualizar(3, datos)).resolves.toEqual({ id_laboratorio: 3 });
    await expect(LaboratorioDAO.actualizar(4, datos)).resolves.toBeNull();
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('AND activo = TRUE'),
      [2, 'Norte', 'Zona 18', 3],
    );
  });
});
