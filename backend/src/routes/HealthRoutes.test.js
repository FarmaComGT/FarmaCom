jest.mock('../database/db', () => ({
  query: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const pool = require('../database/db');
const healthRoutes = require('./HealthRoutes');

const crearApp = () => {
  const app = express();
  app.use('/api/health', healthRoutes);
  return app;
};

describe('HealthRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('responde saludable cuando PostgreSQL está disponible', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const respuesta = await request(crearApp()).get('/api/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      estado: 'saludable',
      base_datos: 'disponible',
    });
    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
  });

  test('responde sin detalles internos cuando PostgreSQL falla', async () => {
    pool.query.mockRejectedValue(new Error('Conexión rechazada por PostgreSQL'));

    const respuesta = await request(crearApp()).get('/api/health');

    expect(respuesta.status).toBe(503);
    expect(respuesta.body).toEqual({
      estado: 'no_disponible',
      base_datos: 'no_disponible',
    });
    expect(respuesta.text).not.toContain('Conexión rechazada');
  });
});
