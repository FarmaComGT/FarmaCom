jest.mock('../middlewares/verificarToken', () => (_req, _res, next) => next());
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/LaboratorioService');

const express = require('express');
const request = require('supertest');
const LaboratorioService = require('../services/LaboratorioService');
const LaboratorioRoutes = require('./LaboratorioRoutes');

const crearApp = () => {
  const app = express();
  app.use(express.json());
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

  it('registra un laboratorio con su ubicación', async () => {
    const datos = { id_ciudad: 2, nombre_laboratorio: 'Laboratorio Norte', direccion: 'Zona 17' };
    LaboratorioService.crear.mockResolvedValue({ id_laboratorio: 3, ...datos });

    const respuesta = await request(crearApp()).post('/api/laboratorios').send(datos);

    expect(respuesta.status).toBe(201);
    expect(LaboratorioService.crear).toHaveBeenCalledWith(datos);
  });

  it('edita un laboratorio con datos válidos', async () => {
    const datos = { id_ciudad: 2, nombre_laboratorio: 'Laboratorio Norte', direccion: 'Zona 10' };
    LaboratorioService.actualizar.mockResolvedValue({ id_laboratorio: 3, ...datos });

    const respuesta = await request(crearApp()).put('/api/laboratorios/3').send(datos);

    expect(respuesta.status).toBe(200);
    expect(LaboratorioService.actualizar).toHaveBeenCalledWith(3, datos);
  });

  it('rechaza una ubicación incompleta', async () => {
    const respuesta = await request(crearApp()).post('/api/laboratorios').send({
      nombre_laboratorio: 'Laboratorio Norte',
    });

    expect(respuesta.status).toBe(400);
    expect(LaboratorioService.crear).not.toHaveBeenCalled();
  });
});
