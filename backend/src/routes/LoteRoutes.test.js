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

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/lotes', LoteRoutes);
  return app;
};

describe('LoteRoutes - historial de precios', () => {
  it('asocia al usuario autenticado cuando cambia un precio', async () => {
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
      9,
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

  it('rechaza identificadores de lote invalidos', async () => {
    const respuesta = await request(crearApp())
      .get('/api/lotes/no-valido/historial-precios');

    expect(respuesta.status).toBe(400);
    expect(HistorialPrecioLoteService.obtenerPorLote).not.toHaveBeenCalled();
  });
});
