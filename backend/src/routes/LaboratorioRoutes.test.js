jest.mock('../middlewares/verificarToken', () => (_req, _res, next) => next());
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/LaboratorioService');

const express = require('express');
const request = require('supertest');
const LaboratorioService = require('../services/LaboratorioService');
const LaboratorioRoutes = require('./LaboratorioRoutes');

const crearApp = () => {
  const app = express();
  app.use('/api/laboratorios', LaboratorioRoutes);
  return app;
};

describe('LaboratorioRoutes', () => {
  it('lista los laboratorios activos', async () => {
    LaboratorioService.listarActivos.mockResolvedValue([
      { id_laboratorio: 1, nombre_laboratorio: 'Laboratorio Central' },
    ]);

    const respuesta = await request(crearApp()).get('/api/laboratorios');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([{ id_laboratorio: 1, nombre_laboratorio: 'Laboratorio Central' }]);
  });
});
