jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 9, id_sucursal: 3, rol: 'administrador' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/LoteService');
jest.mock('../services/HistorialPrecioLoteService');

const express = require('express');
const request = require('supertest');
const LoteService = require('../services/LoteService');
const HistorialPrecioLoteService = require('../services/HistorialPrecioLoteService');
const LoteRoutes = require('./LoteRoutes');
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/lotes', LoteRoutes);
  app.use(errorHandler);
  return app;
};

const payloadLote = {
  id_producto: 1,
  id_proveedor: 1,
  id_sucursal: 3,
  numero_lote: 'LT-SIN-VENCIMIENTO',
  fecha_vencimiento: null,
  cantidad_ingresada: 10,
  precio_compra: 7.5,
  precio_venta: 10,
  margen_ganancia: 25,
};

describe('LoteRoutes - precio por lote y vencimiento opcional', () => {
  beforeEach(() => jest.clearAllMocks());

  it('permite crear un lote con precio de compra y sin fecha de vencimiento', async () => {
    LoteService.crearLote.mockImplementation(async (datos) => ({ id_lote: 7, ...datos }));

    const respuesta = await request(crearApp())
      .post('/api/lotes')
      .send(payloadLote);

    expect(respuesta.status).toBe(201);
    expect(LoteService.crearLote).toHaveBeenCalledWith(
      expect.objectContaining({ precio_compra: 7.5, fecha_vencimiento: null }),
      9,
    );
    expect(respuesta.body.fecha_vencimiento).toBeNull();
  });

  it('rechaza la creación de un lote sin precio de compra', async () => {
    const { precio_compra, ...sinPrecioCompra } = payloadLote;

    const respuesta = await request(crearApp())
      .post('/api/lotes')
      .send(sinPrecioCompra);

    expect(precio_compra).toBe(7.5);
    expect(respuesta.status).toBe(400);
    expect(LoteService.crearLote).not.toHaveBeenCalled();
  });

  it('permite quitar la fecha de vencimiento durante una actualización', async () => {
    LoteService.actualizarLote.mockResolvedValue({ id_lote: 7, fecha_vencimiento: null });

    const respuesta = await request(crearApp())
      .patch('/api/lotes/7')
      .send({ fecha_vencimiento: null });

    expect(respuesta.status).toBe(200);
    expect(LoteService.actualizarLote).toHaveBeenCalledWith(
      7,
      { fecha_vencimiento: null },
    );
  });
});

describe('LoteRoutes - historial de precios', () => {
  it('trata el cambio de precio de un lote como una corrección', async () => {
    LoteService.actualizarLote.mockResolvedValue({
      id_lote: 7,
      precio_compra: 11.5,
      precio_venta: 17.25,
    });

    const respuesta = await request(crearApp())
      .patch('/api/lotes/7')
      .send({ precio_compra: 11.5, precio_venta: 17.25 });

    expect(respuesta.status).toBe(200);
    expect(LoteService.actualizarLote).toHaveBeenCalledWith(
      7,
      { precio_compra: 11.5, precio_venta: 17.25 },
    );
  });

  it('expone el historial de un lote', async () => {
    const historial = [{
      id_historial_precio: 1,
      tipo_precio: 'venta',
      valor_anterior: '15.00',
      valor_nuevo: '17.25',
    }];
    HistorialPrecioLoteService.obtenerPorLote.mockResolvedValue(historial);

    const respuesta = await request(crearApp())
      .get('/api/lotes/7/historial-precios');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(historial);
    expect(HistorialPrecioLoteService.obtenerPorLote).toHaveBeenCalledWith(7);
  });

  it('rechaza identificadores de lote inválidos', async () => {
    const respuesta = await request(crearApp())
      .get('/api/lotes/no-valido/historial-precios');

    expect(respuesta.status).toBe(400);
    expect(HistorialPrecioLoteService.obtenerPorLote).not.toHaveBeenCalled();
  });
});
