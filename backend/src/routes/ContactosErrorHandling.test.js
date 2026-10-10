jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 1, rol: 'administrador' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/CasaEmailService');
jest.mock('../services/CasaTelefonoService');
jest.mock('../services/ProveedorEmailService');
jest.mock('../services/ProveedorTelefonoService');
jest.mock('../services/CorreoSucursalService');
jest.mock('../services/TelefonoSucursalService');
jest.mock('../services/ContactoSucursalService');

const request = require('supertest');
const express = require('express');
const AppError = require('../errors/AppError');
const CasaFarmaceuticaRoutes = require('./CasaFarmaceuticaRoutes');
const ProveedorRoutes = require('./ProveedorRoutes');
const CorreoSucursalRoutes = require('./CorreoSucursalRoutes');
const TelefonoSucursalRoutes = require('./TelefonoSucursalRoutes');
const ContactoSucursalRoutes = require('./ContactoSucursalRoutes');
const CasaEmailService = require('../services/CasaEmailService');
const CasaTelefonoService = require('../services/CasaTelefonoService');
const ProveedorEmailService = require('../services/ProveedorEmailService');
const ProveedorTelefonoService = require('../services/ProveedorTelefonoService');
const CorreoSucursalService = require('../services/CorreoSucursalService');
const ContactoSucursalService = require('../services/ContactoSucursalService');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/casas', CasaFarmaceuticaRoutes);
app.use('/api/proveedores', ProveedorRoutes);
app.use('/api/sucursales/:id_sucursal/telefonos', TelefonoSucursalRoutes);
app.use('/api/sucursales/:id_sucursal/correos', CorreoSucursalRoutes);
app.use('/api/telefonos', TelefonoSucursalRoutes);
app.use('/api/correos', CorreoSucursalRoutes);
app.use('/legacy/sucursales/:id/contactos', ContactoSucursalRoutes);
app.use(errorHandler);

describe('validación centralizada de contactos', () => {
  it.each([
    ['/api/casas/no-es-id/correos', CasaEmailService.obtenerPorCasa],
    ['/api/casas/no-es-id/telefonos', CasaTelefonoService.obtenerPorCasa],
    ['/api/proveedores/no-es-id/correos', ProveedorEmailService.obtenerPorProveedor],
    ['/api/proveedores/no-es-id/telefonos', ProveedorTelefonoService.obtenerPorProveedor],
  ])('rechaza el identificador padre inválido en %s', async (ruta, servicio) => {
    const respuesta = await request(app).get(ruta);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('La solicitud contiene datos inválidos.');
    expect(servicio).not.toHaveBeenCalled();
  });

  it('valida el correo antes de crear un contacto de casa', async () => {
    const respuesta = await request(app)
      .post('/api/casas/1/correos')
      .send({ correo: 'correo-inválido' });

    expect(respuesta.status).toBe(400);
    expect(CasaEmailService.crearEmail).not.toHaveBeenCalled();
  });

  it('valida el ID propio en las rutas planas de sucursal', async () => {
    const respuesta = await request(app).get('/api/correos/no-es-id');

    expect(respuesta.status).toBe(400);
    expect(CorreoSucursalService.obtenerPorId).not.toHaveBeenCalled();
  });
});

describe('respuestas de contactos', () => {
  it('mantiene la respuesta exitosa al crear un teléfono de proveedor', async () => {
    ProveedorTelefonoService.crearTelefono.mockResolvedValue({
      id_telefono: 7,
      id_proveedor: 2,
      numero: '5555-0101',
    });

    const respuesta = await request(app)
      .post('/api/proveedores/2/telefonos')
      .send({ numero: '5555-0101' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({
      id_telefono: 7,
      id_proveedor: 2,
      numero: '5555-0101',
    });
  });

  it('delega al middleware los errores operacionales de sucursal', async () => {
    CorreoSucursalService.obtenerPorSucursal.mockRejectedValue(
      new AppError('La sucursal no existe', 404),
    );

    const respuesta = await request(app).get('/api/sucursales/999/correos');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'La sucursal no existe' });
  });

  it('moderniza la ruta legado sin exponerla en la aplicación', async () => {
    ContactoSucursalService.agregarCorreo.mockRejectedValue(
      new AppError('El correo es requerido', 400),
    );

    const respuesta = await request(app)
      .post('/legacy/sucursales/1/contactos/correos')
      .send({ correo: 'contacto@farmacom.test' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({ mensaje: 'El correo es requerido' });
  });
});
