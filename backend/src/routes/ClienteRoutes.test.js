jest.mock('../middlewares/verificarToken', () => (_req, _res, next) => next());
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/ClienteService');

const express = require('express');
const request = require('supertest');
const ClienteService = require('../services/ClienteService');
const ClienteRoutes = require('./ClienteRoutes');
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/clientes', ClienteRoutes);
  app.use(errorHandler);
  return app;
};

describe('ClienteRoutes - NIT', () => {
  it.each(['pagina=0', 'pagina=1.5', 'pagina=2147483648', 'limite=101', 'pagina[]=1'])('rechaza paginación inválida: %s', async (consulta) => {
    const respuesta = await request(crearApp()).get(`/api/clientes?${consulta}`);
    expect(respuesta.status).toBe(400);
    expect(ClienteService.obtenerTodos).not.toHaveBeenCalled();
  });

  it('convierte y entrega los parámetros de paginación al servicio', async () => {
    ClienteService.obtenerTodos.mockResolvedValue({ datos: [], paginacion: { total: 0 } });
    const respuesta = await request(crearApp()).get('/api/clientes?pagina=2&limite=10&busqueda=%20Ana%20');
    expect(respuesta.status).toBe(200);
    expect(ClienteService.obtenerTodos).toHaveBeenCalledWith({ pagina: 2, limite: 10, busqueda: 'Ana' });
  });
  beforeEach(() => {
    ClienteService.crearCliente.mockImplementation(async (datos) => datos);
    ClienteService.actualizarCliente.mockImplementation(async (_id, datos) => datos);
  });

  it('normaliza el NIT antes de crear el cliente', async () => {
    const respuesta = await request(crearApp())
      .post('/api/clientes')
      .send({ nombre_cliente: 'Ana', nit: ' 1234567-k ' });

    expect(respuesta.status).toBe(201);
    expect(ClienteService.crearCliente).toHaveBeenCalledWith({
      nombre_cliente: 'Ana',
      nit: '1234567-K',
    });
  });

  it('rechaza un NIT con formato inválido', async () => {
    const respuesta = await request(crearApp())
      .post('/api/clientes')
      .send({ nombre_cliente: 'Ana', nit: 'ABC-123' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores[0].msg).toContain('nit debe contener dígitos');
    expect(ClienteService.crearCliente).not.toHaveBeenCalled();
  });

  it('permite limpiar el NIT con null al actualizar', async () => {
    const respuesta = await request(crearApp())
      .put('/api/clientes/4')
      .send({ nit: null });

    expect(respuesta.status).toBe(200);
    expect(ClienteService.actualizarCliente).toHaveBeenCalledWith(4, { nit: null });
  });

  it('rechaza un ID inválido antes de llamar al servicio', async () => {
    const respuesta = await request(crearApp()).get('/api/clientes/no-es-id');

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
    expect(ClienteService.obtenerPorId).not.toHaveBeenCalled();
  });
});
