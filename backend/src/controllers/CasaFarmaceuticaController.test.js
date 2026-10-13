jest.mock('../services/CasaFarmaceuticaService');

const CasaFarmaceuticaService = require('../services/CasaFarmaceuticaService');
const CasaFarmaceuticaController = require('./CasaFarmaceuticaController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CasaFarmaceuticaController', () => {
  describe('crear', () => {
    it('responde 201 con la casa creada', async () => {
      CasaFarmaceuticaService.crearCasa.mockResolvedValue({ id_casa: 1, nombre: 'Bayer' });

      const req = { body: { nombre: 'Bayer' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_casa: 1, nombre: 'Bayer' });
    });

    it('envía al middleware el error del service (409 duplicado)', async () => {
      const error = new Error('Ya existe una casa farmacéutica con ese nombre');
      error.status = 409;
      CasaFarmaceuticaService.crearCasa.mockRejectedValue(error);

      const req = { body: { nombre: 'Bayer' } };
      const res = mockResponse();
      const next = jest.fn();

      await CasaFarmaceuticaController.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('obtenerTodas', () => {
    it('responde 200 con la lista de casas', async () => {
      CasaFarmaceuticaService.obtenerTodas.mockResolvedValue([{ id_casa: 1 }]);

      const res = mockResponse();

      await CasaFarmaceuticaController.obtenerTodas({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_casa: 1 }]);
    });
  });

  describe('obtenerPorId', () => {
    it('envía al middleware el error cuando no existe', async () => {
      const error = new Error('Casa farmacéutica no encontrada');
      error.status = 404;
      CasaFarmaceuticaService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await CasaFarmaceuticaController.obtenerPorId(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('responde 200 con la casa actualizada', async () => {
      CasaFarmaceuticaService.actualizarCasa.mockResolvedValue({ id_casa: 1, nombre: 'Bayer S.A.' });

      const req = { params: { id: '1' }, body: { nombre: 'Bayer S.A.' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.actualizar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cambiarEstado', () => {
    it('responde 200 cuando "activo" es un booleano válido', async () => {
      CasaFarmaceuticaService.cambiarEstado.mockResolvedValue({ id_casa: 1, activo: false });

      const req = { params: { id: '1' }, body: { activo: false } };
      const res = mockResponse();

      await CasaFarmaceuticaController.cambiarEstado(req, res);

      expect(CasaFarmaceuticaService.cambiarEstado).toHaveBeenCalledWith(1, false);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('envía al middleware el error del service', async () => {
      const error = new Error('Casa farmacéutica no encontrada');
      error.status = 404;
      CasaFarmaceuticaService.cambiarEstado.mockRejectedValue(error);

      const req = { params: { id: '1' }, body: { activo: true } };
      const res = mockResponse();
      const next = jest.fn();

      await CasaFarmaceuticaController.cambiarEstado(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('responde 200 con el mensaje de confirmación', async () => {
      CasaFarmaceuticaService.eliminarCasa.mockResolvedValue({ mensaje: 'Casa farmacéutica eliminada correctamente' });

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.eliminar(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerProveedoresVinculados', () => {
    it('responde 200 con los proveedores vinculados', async () => {
      CasaFarmaceuticaService.obtenerProveedoresVinculados.mockResolvedValue([{ id_proveedor: 1 }]);

      const req = { params: { id: '1' } };
      const res = mockResponse();

      await CasaFarmaceuticaController.obtenerProveedoresVinculados(req, res);

      expect(CasaFarmaceuticaService.obtenerProveedoresVinculados).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id_proveedor: 1 }]);
    });

    it('envía al middleware el error cuando la casa no existe', async () => {
      const error = new Error('Casa farmacéutica no encontrada');
      error.status = 404;
      CasaFarmaceuticaService.obtenerProveedoresVinculados.mockRejectedValue(error);

      const req = { params: { id: '99' } };
      const res = mockResponse();
      const next = jest.fn();

      await CasaFarmaceuticaController.obtenerProveedoresVinculados(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
