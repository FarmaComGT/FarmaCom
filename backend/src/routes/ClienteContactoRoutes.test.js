jest.mock('../middlewares/verificarToken', () => (_req, _res, next) => next());
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/ClienteService');
jest.mock('../services/ClienteContactoService');

const express = require('express');
const request = require('supertest');
const AppError = require('../errors/AppError');
const ClienteContactoService = require('../services/ClienteContactoService');
const ClienteRoutes = require('./ClienteRoutes');
const errorHandler = require('../middlewares/errorHandler');

const crearApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/clientes', ClienteRoutes);
  app.use(errorHandler);
  return app;
};

describe('ClienteRoutes - contactos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ClienteContactoService.agregarTelefono.mockImplementation(async (id_cliente, numero) => ({
      id_telefono: 1,
      id_cliente,
      numero,
    }));
    ClienteContactoService.agregarCorreo.mockImplementation(async (id_cliente, correo) => ({
      id_email: 1,
      id_cliente,
      correo,
    }));
  });

  it('lista los teléfonos del cliente', async () => {
    ClienteContactoService.listarTelefonos.mockResolvedValue([{ id_telefono: 1, numero: '55551234' }]);

    const respuesta = await request(crearApp()).get('/api/clientes/3/telefonos');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([{ id_telefono: 1, numero: '55551234' }]);
    expect(ClienteContactoService.listarTelefonos).toHaveBeenCalledWith(3);
  });

  it('normaliza el teléfono antes de llamar al servicio', async () => {
    const respuesta = await request(crearApp())
      .post('/api/clientes/3/telefonos')
      .send({ numero: ' 5555-1234 ' });

    expect(respuesta.status).toBe(201);
    expect(ClienteContactoService.agregarTelefono).toHaveBeenCalledWith(3, '55551234');
  });

  it.each([
    ['sin número', {}, 'El número es requerido'],
    ['número corto', { numero: '1234' }, 'El teléfono debe tener entre 8 y 15 dígitos'],
    ['número con letras', { numero: '5555-abcd' }, 'El teléfono debe tener entre 8 y 15 dígitos'],
  ])('rechaza un teléfono %s', async (_caso, cuerpo, mensaje) => {
    const respuesta = await request(crearApp()).post('/api/clientes/3/telefonos').send(cuerpo);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores[0].msg).toContain(mensaje);
    expect(ClienteContactoService.agregarTelefono).not.toHaveBeenCalled();
  });

  it('actualiza un teléfono del cliente', async () => {
    ClienteContactoService.actualizarTelefono.mockResolvedValue({ id_telefono: 2, numero: '55559999' });

    const respuesta = await request(crearApp())
      .put('/api/clientes/3/telefonos/2')
      .send({ numero: '5555 9999' });

    expect(respuesta.status).toBe(200);
    expect(ClienteContactoService.actualizarTelefono).toHaveBeenCalledWith(3, 2, '55559999');
  });

  it('elimina un teléfono del cliente', async () => {
    ClienteContactoService.eliminarTelefono.mockResolvedValue({ mensaje: 'Teléfono eliminado correctamente' });

    const respuesta = await request(crearApp()).delete('/api/clientes/3/telefonos/2');

    expect(respuesta.status).toBe(200);
    expect(ClienteContactoService.eliminarTelefono).toHaveBeenCalledWith(3, 2);
  });

  it('rechaza ids inválidos antes de llamar al servicio', async () => {
    const respuestaCliente = await request(crearApp()).get('/api/clientes/abc/telefonos');
    const respuestaTelefono = await request(crearApp()).delete('/api/clientes/3/telefonos/0');

    expect(respuestaCliente.status).toBe(400);
    expect(respuestaTelefono.status).toBe(400);
    expect(ClienteContactoService.listarTelefonos).not.toHaveBeenCalled();
    expect(ClienteContactoService.eliminarTelefono).not.toHaveBeenCalled();
  });

  it('responde 409 cuando el servicio detecta un duplicado', async () => {
    ClienteContactoService.agregarTelefono.mockRejectedValue(
      new AppError('El cliente ya tiene registrado ese teléfono', 409),
    );

    const respuesta = await request(crearApp())
      .post('/api/clientes/3/telefonos')
      .send({ numero: '55551234' });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({ mensaje: 'El cliente ya tiene registrado ese teléfono' });
  });

  it('lista los correos del cliente', async () => {
    ClienteContactoService.listarCorreos.mockResolvedValue([{ id_email: 1 }]);

    const respuesta = await request(crearApp()).get('/api/clientes/3/correos');

    expect(respuesta.status).toBe(200);
    expect(ClienteContactoService.listarCorreos).toHaveBeenCalledWith(3);
  });

  it('normaliza el correo antes de llamar al servicio', async () => {
    const respuesta = await request(crearApp())
      .post('/api/clientes/3/correos')
      .send({ correo: ' Ana@FarmaCom.Test ' });

    expect(respuesta.status).toBe(201);
    expect(ClienteContactoService.agregarCorreo).toHaveBeenCalledWith(3, 'ana@farmacom.test');
  });

  it('rechaza un correo con formato inválido', async () => {
    const respuesta = await request(crearApp())
      .post('/api/clientes/3/correos')
      .send({ correo: 'ana@farmacom' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores[0].msg).toBe('El correo no tiene un formato válido');
    expect(ClienteContactoService.agregarCorreo).not.toHaveBeenCalled();
  });

  it('actualiza y elimina un correo del cliente', async () => {
    ClienteContactoService.actualizarCorreo.mockResolvedValue({ id_email: 4 });
    ClienteContactoService.eliminarCorreo.mockResolvedValue({ mensaje: 'Correo eliminado correctamente' });

    const actualizado = await request(crearApp())
      .put('/api/clientes/3/correos/4')
      .send({ correo: 'nuevo@farmacom.test' });
    const eliminado = await request(crearApp()).delete('/api/clientes/3/correos/4');

    expect(actualizado.status).toBe(200);
    expect(eliminado.status).toBe(200);
    expect(ClienteContactoService.actualizarCorreo).toHaveBeenCalledWith(3, 4, 'nuevo@farmacom.test');
    expect(ClienteContactoService.eliminarCorreo).toHaveBeenCalledWith(3, 4);
  });

  it('responde 404 cuando el servicio no encuentra el contacto del cliente', async () => {
    ClienteContactoService.eliminarCorreo.mockRejectedValue(new AppError('Correo no encontrado', 404));

    const respuesta = await request(crearApp()).delete('/api/clientes/3/correos/99');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Correo no encontrado' });
  });
});
