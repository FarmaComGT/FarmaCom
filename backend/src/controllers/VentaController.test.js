jest.mock('../services/VentaService');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { validationResult } = require('express-validator');
const VentaService = require('../services/VentaService');
const VentaController = require('./VentaController');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sinErroresDeValidacion = () => ({ isEmpty: () => true, array: () => [] });
const usuario = { id_usuario: 1, rol: 'dependiente', id_sucursal: 1 };

describe('VentaController', () => {
  describe('crear', () => {
    it('responde 201 con la venta creada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      VentaService.crearVenta.mockResolvedValue({ id_venta: 1 });

      const req = { body: { detalles: [] }, usuario };
      const res = mockResponse();

      await VentaController.crear(req, res);

      expect(VentaService.crearVenta).toHaveBeenCalledWith({ detalles: [] }, usuario);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 cuando hay errores de validación y no llama al service', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {}, usuario };
      const res = mockResponse();

      await VentaController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(VentaService.crearVenta).not.toHaveBeenCalled();
    });

    it('propaga el código de error del service (409 stock insuficiente)', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Stock insuficiente para el lote 1');
      error.status = 409;
      VentaService.crearVenta.mockRejectedValue(error);

      const req = { body: {}, usuario };
      const res = mockResponse();

      await VentaController.crear(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('crearPagoPOS', () => {
    it('responde 201 con el pago creado', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      VentaService.crearPagoPOS.mockResolvedValue({ external_id: 'x1' });

      const req = { body: {}, usuario };
      const res = mockResponse();

      await VentaController.crearPagoPOS(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { body: {}, usuario };
      const res = mockResponse();

      await VentaController.crearPagoPOS(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(VentaService.crearPagoPOS).not.toHaveBeenCalled();
    });
  });

  describe('obtenerEstadoPagoPOS', () => {
    it('responde 200 con el estado del pago', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      VentaService.obtenerEstadoPagoPOS.mockResolvedValue({ estado: 'aprobado' });

      const req = { params: { externalId: 'x1' }, usuario };
      const res = mockResponse();

      await VentaController.obtenerEstadoPagoPOS(req, res);

      expect(VentaService.obtenerEstadoPagoPOS).toHaveBeenCalledWith('x1', usuario);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerTodas', () => {
    it('responde 200 con la lista de ventas', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      VentaService.obtenerTodas.mockResolvedValue([{ id_venta: 1 }]);

      const req = { query: { id_sucursal: '1' }, usuario };
      const res = mockResponse();

      await VentaController.obtenerTodas(req, res);

      expect(VentaService.obtenerTodas).toHaveBeenCalledWith({ id_sucursal: '1' }, usuario);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('obtenerPorId', () => {
    it('responde 404 cuando la venta no existe', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      const error = new Error('Venta no encontrada');
      error.status = 404;
      VentaService.obtenerPorId.mockRejectedValue(error);

      const req = { params: { id: '99' }, usuario };
      const res = mockResponse();

      await VentaController.obtenerPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('asociarCliente', () => {
    it('responde 200 con la venta actualizada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      VentaService.asociarCliente.mockResolvedValue({ id_venta: 1, id_cliente: 5 });

      const req = { params: { id: '1' }, body: { id_cliente: 5 }, usuario };
      const res = mockResponse();

      await VentaController.asociarCliente(req, res);

      expect(VentaService.asociarCliente).toHaveBeenCalledWith(1, 5, usuario);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('anular', () => {
    it('responde 200 con la venta anulada', async () => {
      validationResult.mockReturnValue(sinErroresDeValidacion());
      VentaService.anularVenta.mockResolvedValue({ id_venta: 1, estado: 'anulada' });

      const req = { params: { id: '1' }, body: { motivo_anulacion: 'Error de cobro' }, usuario };
      const res = mockResponse();

      await VentaController.anular(req, res);

      expect(VentaService.anularVenta).toHaveBeenCalledWith(1, 'Error de cobro', usuario);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde 400 cuando hay errores de validación', async () => {
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => [] });

      const req = { params: { id: '1' }, body: {}, usuario };
      const res = mockResponse();

      await VentaController.anular(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(VentaService.anularVenta).not.toHaveBeenCalled();
    });
  });
});
