const express = require('express');
const request = require('supertest');
const subirPdfResultado = require('./subirPdfResultado');
const errorHandler = require('./errorHandler');

const crearApp = () => {
  const app = express();
  app.post('/subir', subirPdfResultado, (req, res) => res.status(201).json({
    nombre: req.file?.originalname ?? null,
    tamano: req.file?.size ?? null,
  }));
  app.use(errorHandler);
  return app;
};

const pdf = (bytes) => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(bytes)]);

describe('subirPdfResultado', () => {
  it('deja el PDF en memoria para el siguiente middleware', async () => {
    const respuesta = await request(crearApp())
      .post('/subir')
      .attach('archivo', pdf(100), { filename: 'resultado.pdf', contentType: 'application/pdf' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ nombre: 'resultado.pdf', tamano: 109 });
  });

  it('continúa sin archivo para que la validación de la ruta lo rechace', async () => {
    const respuesta = await request(crearApp()).post('/subir').field('categoria', 'Sangre');

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ nombre: null, tamano: null });
  });

  it('rechaza archivos que no son PDF', async () => {
    const respuesta = await request(crearApp())
      .post('/subir')
      .attach('archivo', Buffer.from('texto'), { filename: 'notas.txt', contentType: 'text/plain' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('El archivo debe ser un PDF');
  });

  it('rechaza un PDF mayor a 10 MB', async () => {
    const respuesta = await request(crearApp())
      .post('/subir')
      .attach('archivo', pdf(10 * 1024 * 1024 + 1), { filename: 'grande.pdf', contentType: 'application/pdf' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('El archivo supera el tamaño máximo permitido (10 MB)');
  });

  it('responde 400 con un mensaje genérico ante otros errores de carga', async () => {
    const respuesta = await request(crearApp())
      .post('/subir')
      .attach('otro_campo', pdf(10), { filename: 'resultado.pdf', contentType: 'application/pdf' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('No se pudo procesar el archivo adjunto.');
  });
});
