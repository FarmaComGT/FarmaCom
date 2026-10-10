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

const app = express();
app.use(express.json());
app.use('/api/categorias', categoriaRoutes);
app.use('/api/ciudades', ciudadRoutes);
app.use((error, _req, res, _next) => {
  const response = { mensaje: error.message };
  if (error.details) response.errores = error.details;
  res.status(error.statusCode || error.status || 500).json(response);
});

describe('Rutas de categorías', () => {
  it('responde 201 con la categoría creada', async () => {
    const categoria = { id_categoria: 1, nombre: 'Analgésicos' };
    categoriaService.crearCategoria.mockResolvedValue(categoria);

    const respuesta = await request(app)
      .post('/api/categorias')
      .send({ nombre: 'Analgésicos' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual(categoria);
  });

  it('responde 400 con los detalles de validación', async () => {
    const respuesta = await request(app)
      .post('/api/categorias')
      .send({});

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'nombre', msg: 'nombre es requerido' }),
    ]));
    expect(categoriaService.crearCategoria).not.toHaveBeenCalled();
  });

  it('responde 409 cuando el nombre ya existe', async () => {
    const error = new Error('Ya existe una categoría con ese nombre');
    error.status = 409;
    categoriaService.crearCategoria.mockRejectedValue(error);

    const respuesta = await request(app)
      .post('/api/categorias')
      .send({ nombre: 'Analgésicos' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'Ya existe una categoría con ese nombre',
    });
  });
});

describe('Rutas de ciudades', () => {
  it('responde 201 con la ciudad creada', async () => {
    const ciudad = { id_ciudad: 1, nombre_ciudad: 'Guatemala' };
    ciudadService.crearCiudad.mockResolvedValue(ciudad);

    const respuesta = await request(app)
      .post('/api/ciudades')
      .send({ nombre_ciudad: 'Guatemala' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual(ciudad);
  });

  it('responde 400 con los detalles de validación', async () => {
    const respuesta = await request(app)
      .post('/api/ciudades')
      .send({});

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'nombre_ciudad',
        msg: 'nombre_ciudad es requerido',
      }),
    ]));
    expect(ciudadService.crearCiudad).not.toHaveBeenCalled();
  });

  it('responde 409 cuando el nombre ya existe', async () => {
    const error = new Error('Ya existe una ciudad con ese nombre');
    error.status = 409;
    ciudadService.crearCiudad.mockRejectedValue(error);

    const respuesta = await request(app)
      .post('/api/ciudades')
      .send({ nombre_ciudad: 'Guatemala' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'Ya existe una ciudad con ese nombre',
    });
  });
});
