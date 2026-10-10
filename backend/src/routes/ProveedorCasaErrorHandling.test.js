jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 1, rol: 'dueno' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/ProveedorService');
jest.mock('../services/CasaFarmaceuticaService');

const request = require('supertest');
const express = require('express');
const AppError = require('../errors/AppError');
const ProveedorRoutes = require('./ProveedorRoutes');
const CasaFarmaceuticaRoutes = require('./CasaFarmaceuticaRoutes');
const ProveedorService = require('../services/ProveedorService');
const CasaFarmaceuticaService = require('../services/CasaFarmaceuticaService');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/proveedores', ProveedorRoutes);
app.use('/api/casas', CasaFarmaceuticaRoutes);
app.use(errorHandler);

describe.each([
  {
    entidad: 'Proveedor',
    baseUrl: '/api/proveedores',
    crear: ProveedorService.crearProveedor,
    obtenerPorId: ProveedorService.obtenerPorId,
    cambiarEstado: ProveedorService.cambiarEstado,
  },
  {
    entidad: 'Casa Farmacéutica',
    baseUrl: '/api/casas',
    crear: CasaFarmaceuticaService.crearCasa,
    obtenerPorId: CasaFarmaceuticaService.obtenerPorId,
    cambiarEstado: CasaFarmaceuticaService.cambiarEstado,
  },
])('manejo centralizado de $entidad', ({ baseUrl, crear, obtenerPorId, cambiarEstado }) => {
  it('mantiene la respuesta exitosa de creación', async () => {
    crear.mockResolvedValue({ id: 1, nombre: 'Entidad de prueba' });

    const respuesta = await request(app)
      .post(baseUrl)
      .send({ nombre: 'Entidad de prueba' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ id: 1, nombre: 'Entidad de prueba' });
  });

  it('rechaza un ID inválido antes de llamar al servicio', async () => {
    const respuesta = await request(app).get(`${baseUrl}/no-es-id`);

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
    expect(obtenerPorId).not.toHaveBeenCalled();
  });

  it('mantiene estrictamente booleano el cambio de estado', async () => {
    const respuesta = await request(app)
      .patch(`${baseUrl}/1/estado`)
      .send({ activo: 'true' });

    expect(respuesta.status).toBe(400);
    expect(cambiarEstado).not.toHaveBeenCalled();
  });
});

describe('errores operacionales de proveedores y casas', () => {
  it('delega al middleware un proveedor inexistente', async () => {
    ProveedorService.obtenerPorId.mockRejectedValue(
      new AppError('Proveedor no encontrado', 404),
    );

    const respuesta = await request(app).get('/api/proveedores/999');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Proveedor no encontrado' });
  });

  it('delega errores al consultar proveedores vinculados a una casa', async () => {
    CasaFarmaceuticaService.obtenerProveedoresVinculados.mockRejectedValue(
      new AppError('Casa farmacéutica no encontrada', 404),
    );

    const respuesta = await request(app).get('/api/casas/999/proveedores');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Casa farmacéutica no encontrada' });
  });
});
