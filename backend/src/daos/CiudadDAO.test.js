jest.mock('../database/db');

const pool = require('../database/db');
const CiudadDAO = require('./CiudadDAO');

describe('CiudadDAO', () => {
  it('crea una ciudad', async () => {
    const fila = { id_ciudad: 1, nombre_ciudad: 'Guatemala' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CiudadDAO.crear({ nombre_ciudad: 'Guatemala' })).resolves.toEqual(fila);
  });

  it('obtiene todas las ciudades ordenadas por nombre', async () => {
    const filas = [{ id_ciudad: 1 }, { id_ciudad: 2 }];
    pool.query.mockResolvedValue({ rows: filas });

    await expect(CiudadDAO.obtenerTodas()).resolves.toEqual(filas);
  });

  it('devuelve null cuando no encuentra la ciudad por id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await expect(CiudadDAO.obtenerPorId(99)).resolves.toBeNull();
  });

  it('busca una ciudad por nombre sin distinguir mayúsculas', async () => {
    const fila = { id_ciudad: 1, nombre_ciudad: 'Guatemala' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CiudadDAO.obtenerPorNombre('guatemala')).resolves.toEqual(fila);
  });

  it('actualiza el nombre de la ciudad', async () => {
    const fila = { id_ciudad: 1, nombre_ciudad: 'Antigua' };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CiudadDAO.actualizar(1, { nombre_ciudad: 'Antigua' })).resolves.toEqual(fila);
  });

  it('elimina una ciudad', async () => {
    const fila = { id_ciudad: 1 };
    pool.query.mockResolvedValue({ rows: [fila] });

    await expect(CiudadDAO.eliminar(1)).resolves.toEqual(fila);
  });
});
