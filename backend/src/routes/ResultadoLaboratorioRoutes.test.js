jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 9, rol: 'laboratorista' };
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

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/resultados-laboratorio', ResultadoLaboratorioRoutes);
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
      expect.objectContaining({ id_paciente: 3, categoria: 'Hematología', id_usuario: 9 }),
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
  });

  it('anula un resultado con motivo', async () => {
    ResultadoLaboratorioService.anularResultado.mockResolvedValue({ id_resultado: 1, estado: 'anulado' });

    const respuesta = await request(crearApp())
      .patch('/api/resultados-laboratorio/1/anular')
      .send({ motivo_anulacion: 'Archivo incorrecto' });

    expect(respuesta.status).toBe(200);
    expect(ResultadoLaboratorioService.anularResultado).toHaveBeenCalledWith(1, 'Archivo incorrecto', 9);
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
  });

  it('rechaza un token con formato inválido en la descarga pública', async () => {
    const respuesta = await request(crearApp())
      .get('/api/resultados-laboratorio/publico/no-es-un-uuid');

    expect(respuesta.status).toBe(400);
    expect(ResultadoLaboratorioService.obtenerPublico).not.toHaveBeenCalled();
  });

  it('responde 404 con mensaje claro cuando el enlace público no está disponible', async () => {
    const error = new Error('El enlace no esta disponible');
    error.status = 404;
    ResultadoLaboratorioService.obtenerPublico.mockRejectedValue(error);

    const respuesta = await request(crearApp())
      .get('/api/resultados-laboratorio/publico/2f4b6b0e-3b1a-4a34-9c2a-8f6c1a2b3c4d');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.mensaje).toBe('El enlace no esta disponible');
  });
});
