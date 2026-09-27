jest.mock('../middlewares/verificarToken', () => (_req, _res, next) => next());
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/PacienteService');

const express = require('express');
const request = require('supertest');
const PacienteService = require('../services/PacienteService');
const PacienteRoutes = require('./PacienteRoutes');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/pacientes', PacienteRoutes);
  return app;
};

const datosBase = {
  id_laboratorio: 1,
  nombre_paciente: 'Ana López',
  sexo: 'F',
};

describe('PacienteRoutes - sexo y edad', () => {
  beforeEach(() => {
    PacienteService.registrarPaciente.mockImplementation(async (datos) => datos);
    PacienteService.actualizarPaciente.mockImplementation(async (_id, datos) => datos);
  });

  it('registra un paciente con fecha_nacimiento y sexo válidos', async () => {
    const respuesta = await request(crearApp())
      .post('/api/pacientes')
      .send({ ...datosBase, fecha_nacimiento: '1990-01-01' });

    expect(respuesta.status).toBe(201);
    expect(PacienteService.registrarPaciente).toHaveBeenCalled();
  });

  it('registra un paciente con edad_manual y sexo válidos', async () => {
    const respuesta = await request(crearApp())
      .post('/api/pacientes')
      .send({ ...datosBase, edad_manual: 45 });

    expect(respuesta.status).toBe(201);
  });

  it('rechaza el registro si faltan fecha_nacimiento y edad_manual', async () => {
    const respuesta = await request(crearApp())
      .post('/api/pacientes')
      .send(datosBase);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.some((e) => e.msg.includes('exactamente uno'))).toBe(true);
    expect(PacienteService.registrarPaciente).not.toHaveBeenCalled();
  });

  it('rechaza el registro si se envían ambos: fecha_nacimiento y edad_manual', async () => {
    const respuesta = await request(crearApp())
      .post('/api/pacientes')
      .send({ ...datosBase, fecha_nacimiento: '1990-01-01', edad_manual: 30 });

    expect(respuesta.status).toBe(400);
    expect(PacienteService.registrarPaciente).not.toHaveBeenCalled();
  });

  it('rechaza un sexo distinto de M, F u Otro', async () => {
    const respuesta = await request(crearApp())
      .post('/api/pacientes')
      .send({ ...datosBase, sexo: 'X', edad_manual: 30 });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores[0].msg).toContain('sexo debe ser M, F u Otro');
  });

  it('permite actualizar un paciente sin tocar fecha_nacimiento/edad_manual', async () => {
    const respuesta = await request(crearApp())
      .put('/api/pacientes/4')
      .send({ telefono: '5555-0000' });

    expect(respuesta.status).toBe(200);
    expect(PacienteService.actualizarPaciente).toHaveBeenCalledWith(4, { telefono: '5555-0000' });
  });

  it('rechaza actualizar enviando ambos, fecha_nacimiento y edad_manual', async () => {
    const respuesta = await request(crearApp())
      .put('/api/pacientes/4')
      .send({ fecha_nacimiento: '1990-01-01', edad_manual: 30 });

    expect(respuesta.status).toBe(400);
    expect(PacienteService.actualizarPaciente).not.toHaveBeenCalled();
  });
});
