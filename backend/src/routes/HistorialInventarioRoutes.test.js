jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 9, rol: 'administrador' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/HistorialInventarioService');

const express = require('express');
const request = require('supertest');
const HistorialInventarioService = require('../services/HistorialInventarioService');
const routes = require('./HistorialInventarioRoutes');
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use('/api/inventario', routes);
  app.use(errorHandler);
  return app;
};

describe('GET /api/inventario/historial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HistorialInventarioService.obtenerHistorial.mockResolvedValue({
      datos: [], paginacion: { pagina: 2, limite: 25, total: 0, total_paginas: 1 },
    });
  });

  it('normaliza filtros y los atribuye al usuario autenticado', async () => {
    const respuesta = await request(crearApp()).get('/api/inventario/historial').query({
      id_producto: '4', lote: ' LT-1 ', id_sucursal: '3',
      fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31',
      usuario: ' Ana ', tipo_cambio: 'modificacion', pagina: '2', limite: '25',
    });

    expect(respuesta.status).toBe(200);
    expect(HistorialInventarioService.obtenerHistorial).toHaveBeenCalledWith({
      id_producto: 4, lote: 'LT-1', id_sucursal: 3,
      fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31',
      usuario: 'Ana', tipo_cambio: 'modificacion', pagina: 2, limite: 25,
    }, { id_usuario: 9, rol: 'administrador' });
  });

  it('rechaza rangos invertidos y tipos desconocidos', async () => {
    const respuesta = await request(crearApp()).get('/api/inventario/historial').query({
      fecha_desde: '2026-02-01', fecha_hasta: '2026-01-01', tipo_cambio: 'desconocido',
    });

    expect(respuesta.status).toBe(400);
    expect(HistorialInventarioService.obtenerHistorial).not.toHaveBeenCalled();
  });
});
