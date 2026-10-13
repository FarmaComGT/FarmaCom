jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 1, rol: 'dueno' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/PresentacionService');
jest.mock('../services/SucursalService');

const request = require('supertest');
const express = require('express');
const AppError = require('../errors/AppError');
const presentacionRoutes = require('./PresentacionRoutes');
const sucursalRoutes = require('./SucursalRoutes');
const PresentacionService = require('../services/PresentacionService');
const SucursalService = require('../services/SucursalService');
const notFoundHandler = require('../middlewares/notFoundHandler');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/presentaciones', presentacionRoutes);
app.use('/api/sucursales', sucursalRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('manejo centralizado de Presentación', () => {
  it('mantiene la respuesta exitosa al crear una presentación', async () => {
    const presentacion = { id_presentacion: 1, nombre: 'Blíster' };
    PresentacionService.crearPresentacion.mockResolvedValue(presentacion);

    const respuesta = await request(app)
      .post('/api/presentaciones')
      .send({ nombre: 'Blíster' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual(presentacion);
  });

  it('detiene una solicitud inválida antes de llamar al servicio', async () => {
    const respuesta = await request(app)
      .post('/api/presentaciones')
      .send({ nombre: '' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      mensaje: 'La solicitud contiene datos inválidos.',
      errores: expect.arrayContaining([
        expect.objectContaining({ path: 'nombre', msg: 'El nombre es requerido' }),
      ]),
    });
    expect(PresentacionService.crearPresentacion).not.toHaveBeenCalled();
  });

  it('delega al middleware un conflicto del servicio', async () => {
    PresentacionService.crearPresentacion.mockRejectedValue(
      new AppError('Ya existe una presentación con ese nombre', 409),
    );

    const respuesta = await request(app)
      .post('/api/presentaciones')
      .send({ nombre: 'Caja' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'Ya existe una presentación con ese nombre',
    });
  });
});

describe('manejo centralizado de Sucursal', () => {
  it('mantiene la respuesta exitosa al crear una sucursal', async () => {
    const sucursal = {
      id_sucursal: 1,
      id_ciudad: 1,
      nombre_sucursal: 'Central',
      direccion: 'Zona 1',
    };
    SucursalService.crearSucursal.mockResolvedValue(sucursal);

    const respuesta = await request(app)
      .post('/api/sucursales')
      .send({ id_ciudad: 1, nombre_sucursal: 'Central', direccion: 'Zona 1' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual(sucursal);
  });

  it('rechaza un ID inválido antes de llamar al servicio', async () => {
    const respuesta = await request(app).get('/api/sucursales/no-es-id');

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
    expect(SucursalService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('delega al middleware un error de recurso inexistente', async () => {
    SucursalService.obtenerPorId.mockRejectedValue(
      new AppError('Sucursal no encontrada', 404),
    );

    const respuesta = await request(app).get('/api/sucursales/999');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Sucursal no encontrada' });
  });
});
