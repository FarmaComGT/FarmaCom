jest.mock('../services/CategoriaService');

const categoriaService = require('../services/CategoriaService');
const CategoriaController = require('./CategoriaController');

// Helper para simular el objeto 'res' de Express sin levantar un servidor.
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CategoriaController', () => {
  describe('crear', () => {
    it('responde 201 con la categoría creada', async () => {
      categoriaService.crearCategoria.mockResolvedValue({ id_categoria: 1, nombre: 'Analgésicos' });

      const req = { body: { nombre: 'Analgésicos' } };
      const res = mockResponse();
      const next = jest.fn();

      await CategoriaController.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_categoria: 1, nombre: 'Analgésicos' });
      expect(next).not.toHaveBeenCalled();
    });

    it('envía al middleware el error del servicio', async () => {
      const error = new Error('Ya existe una categoría con ese nombre');
      error.status = 409;
      categoriaService.crearCategoria.mockRejectedValue(error);

      const req = { body: { nombre: 'Analgésicos' } };
      const res = mockResponse();
      const next = jest.fn();

      await CategoriaController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('obtenerPorId', () => {
    it('envía al middleware el error si la categoría no existe', async () => {
      const error = new Error('Categoría no encontrada');
      error.status = 404;
      categoriaService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '999' } };
      const res = mockResponse();
      const next = jest.fn();

      await CategoriaController.obtenerPorId(req, res, next);

      expect(categoriaService.obtenerPorId).toHaveBeenCalledWith(999);
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
