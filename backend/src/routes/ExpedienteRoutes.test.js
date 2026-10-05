jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = {
    id_usuario: 9,
    rol: req.get('x-test-role') || 'dueno',
  };
  next();
});
jest.mock('../services/BitacoraLaboratorioService');

const express = require('express');
const request = require('supertest');
const BitacoraLaboratorioService = require('../services/BitacoraLaboratorioService');
const ExpedienteRoutes = require('./ExpedienteRoutes');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/expedientes', ExpedienteRoutes);
  return app;
};

describe('GET /api/expedientes/:id/bitacora', () => {
  const historial = [{
    id_bitacora: 3,
    id_usuario: 9,
    nombre_usuario: 'Dueño General',
    fecha_hora: '2026-10-05T10:00:00.000Z',
    entidad: 'paciente',
    accion: 'actualizar',
    valores_anteriores: { telefono: '1111' },
    valores_nuevos: { telefono: '2222' },
  }];

  beforeEach(() => {
    BitacoraLaboratorioService.obtenerPorExpediente.mockResolvedValue(historial);
  });

  it.each(['dueno', 'administrador'])('permite consultar al rol %s', async (rol) => {
    const respuesta = await request(crearApp())
      .get('/api/expedientes/7/bitacora')
      .set('x-test-role', rol);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(historial);
    expect(BitacoraLaboratorioService.obtenerPorExpediente).toHaveBeenCalledWith(7);
  });

  it.each(['laboratorista', 'dependiente'])('rechaza al rol %s', async (rol) => {
    const respuesta = await request(crearApp())
      .get('/api/expedientes/7/bitacora')
      .set('x-test-role', rol);

    expect(respuesta.status).toBe(403);
    expect(BitacoraLaboratorioService.obtenerPorExpediente).not.toHaveBeenCalled();
  });

  it('rechaza un identificador de expediente invalido', async () => {
    const respuesta = await request(crearApp())
      .get('/api/expedientes/no-valido/bitacora');

    expect(respuesta.status).toBe(400);
    expect(BitacoraLaboratorioService.obtenerPorExpediente).not.toHaveBeenCalled();
  });

  it('propaga un expediente inexistente como 404', async () => {
    const error = new Error('Expediente no encontrado');
    error.status = 404;
    BitacoraLaboratorioService.obtenerPorExpediente.mockRejectedValue(error);

    const respuesta = await request(crearApp())
      .get('/api/expedientes/99/bitacora');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Expediente no encontrado' });
  });
});
