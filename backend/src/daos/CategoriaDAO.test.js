jest.mock('../database/db');

const pool = require('../database/db');
const CategoriaDAO = require('./CategoriaDAO');

describe('CategoriaDAO', () => {
  describe('obtenerTodos', () => {
    it('pagina las categorias sin filtros', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [{ id_categoria: 1 }, { id_categoria: 2 }] });

      await expect(CategoriaDAO.obtenerTodos({ pagina: 1, limite: 2 })).resolves.toEqual({
        datos: [{ id_categoria: 1 }, { id_categoria: 2 }],
        paginacion: { pagina: 1, limite: 2, total: 3, total_paginas: 2 },
      });
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('ORDER BY nombre ASC, id_categoria ASC LIMIT $1 OFFSET $2'),
        [2, 0],
      );
    });

    it('busca sin paginar y escapa comodines SQL', async () => {
      pool.query.mockResolvedValue({ rows: [{ id_categoria: 3, nombre: 'A_100%' }] });

      await expect(CategoriaDAO.obtenerTodos({ busqueda: 'A_100%' })).resolves.toEqual([
        { id_categoria: 3, nombre: 'A_100%' },
      ]);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE nombre ILIKE $1 ESCAPE'),
        ['%A\\_100\\%%'],
      );
    });

    it('combina busqueda y paginacion', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id_categoria: 4, nombre: 'Vitaminas' }] });

      const resultado = await CategoriaDAO.obtenerTodos({
        pagina: 1,
        limite: 25,
        busqueda: 'Vita',
      });

      expect(resultado.paginacion.total).toBe(1);
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['%Vita%', 25, 0],
      );
    });
  });

  describe('crear', () => {
    it('inserta una categoría y devuelve la fila creada', async () => {
      const filaEsperada = { id_categoria: 1, nombre: 'Analgésicos' };
      pool.query.mockResolvedValue({ rows: [filaEsperada] });

      const resultado = await CategoriaDAO.crear({ nombre: 'Analgésicos' });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categoria'),
        ['Analgésicos'],
      );
      expect(resultado).toEqual(filaEsperada);
    });
  });

  describe('obtenerPorId', () => {
    it('devuelve la categoría cuando existe', async () => {
      const fila = { id_categoria: 5, nombre: 'Vitaminas' };
      pool.query.mockResolvedValue({ rows: [fila] });

      const resultado = await CategoriaDAO.obtenerPorId(5);

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [5]);
      expect(resultado).toEqual(fila);
    });

    it('devuelve null cuando no existe ninguna fila', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const resultado = await CategoriaDAO.obtenerPorId(999);

      expect(resultado).toBeNull();
    });
  });

  describe('eliminar', () => {
    it('devuelve la fila eliminada', async () => {
      const fila = { id_categoria: 2, nombre: 'Antibióticos' };
      pool.query.mockResolvedValue({ rows: [fila] });

      const resultado = await CategoriaDAO.eliminar(2);

      expect(resultado).toEqual(fila);
    });
  });
});
