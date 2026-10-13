jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 1, rol: 'administrador' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/CategoriaService');
jest.mock('../services/CiudadService');

const request = require('supertest');
const express = require('express');
const categoriaRoutes = require('./CategoriaRoutes');
const ciudadRoutes = require('./CiudadRoutes');
const categoriaService = require('../services/CategoriaService');
const ciudadService = require('../services/CiudadService');
const notFoundHandler = require('../middlewares/notFoundHandler');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/categorias', categoriaRoutes);
app.use('/api/ciudades', ciudadRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('validación común de catálogos', () => {
  it.each([
    ['/api/categorias/no-es-id', categoriaService.obtenerPorId],
    ['/api/ciudades/no-es-id', ciudadService.obtenerPorId],
  ])('rechaza el ID inválido de %s antes de llamar al servicio', async (ruta, servicio) => {
    const respuesta = await request(app).get(ruta);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      mensaje: 'La solicitud contiene datos inválidos.',
      errores: expect.arrayContaining([
        expect.objectContaining({
          path: 'id',
          msg: 'El id debe ser un entero positivo',
        }),
      ]),
    });
    expect(servicio).not.toHaveBeenCalled();
  });

  it('responde con JSON uniforme para una ruta inexistente', async () => {
    const respuesta = await request(app).get('/api/recurso-inexistente');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Ruta no encontrada.' });
  });
});
