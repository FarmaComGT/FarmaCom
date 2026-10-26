jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 9, rol: 'laboratorista', id_laboratorio: 1 };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/ResultadoLaboratorioService');
jest.mock('../config/almacenamiento', () => ({
  RUTA_UPLOADS_RESULTADOS: require('path').join(require('os').tmpdir(), 'resultados-mock'),
  PUBLIC_API_BASE_URL: 'http://localhost:3000',
}));

const express = require('express');
const request = require('supertest');
const ResultadoLaboratorioService = require('../services/ResultadoLaboratorioService');
const ResultadoLaboratorioRoutes = require('./ResultadoLaboratorioRoutes');
const AppError = require('../errors/AppError');
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/resultados-laboratorio', ResultadoLaboratorioRoutes);
  app.use(errorHandler);
  return app;
};

describe('ResultadoLaboratorioRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sube un resultado válido en PDF', async () => {
    ResultadoLaboratorioService.subirResultado.mockResolvedValue({ id_resultado: 1 });

    const respuesta = await request(crearApp())
      .post('/api/resultados-laboratorio')
      .field('id_paciente', '3')
      .field('categoria', 'Hematología')
      .attach('archivo', Buffer.from('%PDF-1.4 contenido'), { filename: 'resultado.pdf', contentType: 'application/pdf' });

    expect(respuesta.status).toBe(201);
    expect(ResultadoLaboratorioService.subirResultado).toHaveBeenCalledWith(
      expect.objectContaining({
        id_paciente: 3,
        categoria: 'Hematología',
        usuario: { id_usuario: 9, rol: 'laboratorista', id_laboratorio: 1 },
      }),
    );
  });

  it('rechaza un archivo que no es PDF', async () => {
    const respuesta = await request(crearApp())
      .post('/api/resultados-laboratorio')
      .field('id_paciente', '3')
      .field('categoria', 'Hematología')
      .attach('archivo', Buffer.from('no soy un pdf'), { filename: 'archivo.txt', contentType: 'text/plain' });

    expect(respuesta.status).toBe(400);
    expect(ResultadoLaboratorioService.subirResultado).not.toHaveBeenCalled();
  });

  it('rechaza la subida sin archivo adjunto', async () => {
    const respuesta = await request(crearApp())
      .post('/api/resultados-laboratorio')
      .field('id_paciente', '3')
      .field('categoria', 'Hematología');

    expect(respuesta.status).toBe(400);
    expect(ResultadoLaboratorioService.subirResultado).not.toHaveBeenCalled();
  });

  it('lista resultados de un paciente', async () => {
    ResultadoLaboratorioService.listarPorPaciente.mockResolvedValue([{ id_resultado: 1, vigente: true }]);

    const respuesta = await request(crearApp())
      .get('/api/resultados-laboratorio')
      .query({ id_paciente: 3 });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([{ id_resultado: 1, vigente: true }]);
    expect(ResultadoLaboratorioService.listarPorPaciente).toHaveBeenCalledWith(3, {
      id_usuario: 9, rol: 'laboratorista', id_laboratorio: 1,
    });
  });

  it('anula un resultado con motivo', async () => {
    ResultadoLaboratorioService.anularResultado.mockResolvedValue({ id_resultado: 1, estado: 'anulado' });

    const respuesta = await request(crearApp())
      .patch('/api/resultados-laboratorio/1/anular')
      .send({ motivo_anulacion: 'Archivo incorrecto' });

    expect(respuesta.status).toBe(200);
    expect(ResultadoLaboratorioService.anularResultado).toHaveBeenCalledWith(1, 'Archivo incorrecto', {
      id_usuario: 9, rol: 'laboratorista', id_laboratorio: 1,
    });
  });

  it('rechaza anular sin motivo', async () => {
    const respuesta = await request(crearApp())
      .patch('/api/resultados-laboratorio/1/anular')
      .send({});

    expect(respuesta.status).toBe(400);
    expect(ResultadoLaboratorioService.anularResultado).not.toHaveBeenCalled();
  });

  it('devuelve las categorías sugeridas de un laboratorio', async () => {
    ResultadoLaboratorioService.obtenerCategoriasSugeridas.mockResolvedValue(['Orina', 'Sangre']);

    const respuesta = await request(crearApp())
      .get('/api/resultados-laboratorio/categorias')
      .query({ id_laboratorio: 1 });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(['Orina', 'Sangre']);
    expect(ResultadoLaboratorioService.obtenerCategoriasSugeridas).toHaveBeenCalledWith(1, {
      id_usuario: 9, rol: 'laboratorista', id_laboratorio: 1,
    });
  });

  it('rechaza un token con formato inválido en la descarga pública', async () => {
    const respuesta = await request(crearApp())
      .get('/api/resultados-laboratorio/publico/no-es-un-uuid');

    expect(respuesta.status).toBe(400);
    expect(ResultadoLaboratorioService.obtenerPublico).not.toHaveBeenCalled();
  });

  it('responde 404 con mensaje claro cuando el enlace público no está disponible', async () => {
    const error = new AppError('El enlace no esta disponible', 404);
    ResultadoLaboratorioService.obtenerPublico.mockRejectedValue(error);

    const respuesta = await request(crearApp())
      .get('/api/resultados-laboratorio/publico/2f4b6b0e-3b1a-4a34-9c2a-8f6c1a2b3c4d');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.mensaje).toBe('El enlace no esta disponible');
  });

  it('entrega el PDF almacenado por el enlace público temporal', async () => {
    const fs = require('fs');
    const path = require('path');
    const { RUTA_UPLOADS_RESULTADOS } = require('../config/almacenamiento');
    const token = '2f4b6b0e-3b1a-4a34-9c2a-8f6c1a2b3c4d';
    const contenido = '%PDF-1.4 resultado de prueba';
    fs.mkdirSync(RUTA_UPLOADS_RESULTADOS, { recursive: true });
    fs.writeFileSync(path.join(RUTA_UPLOADS_RESULTADOS, `${token}.pdf`), contenido);
    ResultadoLaboratorioService.obtenerPublico.mockResolvedValue({ ruta_archivo: `${token}.pdf` });

    const respuesta = await request(crearApp())
      .get(`/api/resultados-laboratorio/publico/${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const partes = [];
        res.on('data', (parte) => partes.push(parte));
        res.on('end', () => callback(null, Buffer.concat(partes)));
      });

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toContain('application/pdf');
    expect(respuesta.headers['content-disposition']).toBe('inline');
    expect(respuesta.body.toString()).toBe(contenido);
    expect(ResultadoLaboratorioService.obtenerPublico).toHaveBeenCalledWith(token);
  });
});
