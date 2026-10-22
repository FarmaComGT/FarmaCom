const express = require('express');
const request = require('supertest');
const loginRateLimit = require('./loginRateLimit');

const crearApp = () => {
  const app = express();
  app.post('/login', loginRateLimit, (_req, res) => {
    res.status(401).json({ mensaje: 'Credenciales inválidas' });
  });
  return app;
};

describe('límite de intentos de inicio de sesión', () => {
  it('bloquea temporalmente el sexto fallo dentro de la ventana', async () => {
    const app = crearApp();

    for (let intento = 1; intento <= 5; intento += 1) {
      const respuesta = await request(app).post('/login');
      expect(respuesta.status).toBe(401);
    }

    const bloqueada = await request(app).post('/login');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers).toHaveProperty('retry-after');
    expect(bloqueada.body).toEqual({
      mensaje: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.',
    });
  });
});
