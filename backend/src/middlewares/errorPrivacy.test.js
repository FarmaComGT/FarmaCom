const express = require('express');
const request = require('supertest');
const { body, oneOf, checkExact } = require('express-validator');
const AppError = require('../errors/AppError');
const validateRequest = require('./validateRequest');
const errorHandler = require('./errorHandler');

const app = express();
app.use(express.json({ limit: '1kb' }));
app.post('/validar',
  body('contrasena').isLength({ min: 20 }).withMessage('Contraseña demasiado corta'),
  validateRequest,
  (_req, res) => res.sendStatus(204));
app.post('/alternativas',
  oneOf([
    body('token').equals('permitido').withMessage('Token inválido'),
    body('contrasena').isLength({ min: 20 }).withMessage('Contraseña demasiado corta'),
  ]),
  validateRequest,
  (_req, res) => res.sendStatus(204));
app.post('/exacto', checkExact([]), validateRequest, (_req, res) => res.sendStatus(204));
app.get('/externo', (_req, _res, next) => {
  const error = new Error('FICTICIO detalle interno');
  error.status = 400;
  error.details = [{ value: 'FICTICIO' }];
  next(error);
});
app.get('/negocio', (_req, _res, next) => next(new AppError('Correo duplicado', 409)));
app.use(errorHandler);

describe('privacidad de las respuestas de error', () => {
  it('rechaza JSON mal formado sin reflejar el cuerpo ni el mensaje del parser', async () => {
    const respuesta = await request(app).post('/validar')
      .set('Content-Type', 'application/json').send('{"contrasena":FICTICIO}');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({ mensaje: 'El cuerpo de la solicitud contiene JSON inválido.' });
  });

  it('conserva 413 con un mensaje controlado para cuerpos demasiado grandes', async () => {
    const respuesta = await request(app).post('/validar').send({ contrasena: 'x'.repeat(1500) });
    expect(respuesta.status).toBe(413);
    expect(respuesta.body).toEqual({ mensaje: 'La solicitud supera el tamaño máximo permitido.' });
  });

  it('conserva los metadatos de validación sin devolver la contraseña', async () => {
    const respuesta = await request(app).post('/validar').send({ contrasena: 'FICTICIO' });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual([{
      type: 'field', path: 'contrasena', location: 'body', msg: 'Contraseña demasiado corta',
    }]);
  });

  it.each(['/alternativas', '/exacto'])('omite valores también en errores agrupados: %s', async (ruta) => {
    const respuesta = await request(app).post(ruta)
      .send({ contrasena: 'FICTICIO', token: 'FICTICIO' });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.length).toBeGreaterThan(0);
    expect(JSON.stringify(respuesta.body)).not.toContain('FICTICIO');
    expect(JSON.stringify(respuesta.body)).not.toContain('"value"');
  });

  it('no confía en mensajes de terceros por tener un estado 400', async () => {
    const respuesta = await request(app).get('/externo');
    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({ mensaje: 'No se pudo procesar la solicitud.' });
  });

  it('preserva el mensaje y el estado de los errores de negocio explícitos', async () => {
    const respuesta = await request(app).get('/negocio');
    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({ mensaje: 'Correo duplicado' });
  });

  it('permite continuar cuando la validación es correcta', async () => {
    await request(app).post('/validar').send({ contrasena: 'x'.repeat(24) }).expect(204);
  });
});
