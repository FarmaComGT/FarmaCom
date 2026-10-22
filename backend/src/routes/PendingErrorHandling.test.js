jest.mock('../middlewares/verificarToken', () => (req, _res, next) => {
  req.usuario = { id_usuario: 1, id_sucursal: 1, rol: 'dueno' };
  next();
});
jest.mock('../middlewares/verificarRol', () => () => (_req, _res, next) => next());
jest.mock('../services/AuthService');
jest.mock('../services/UsuarioService');
jest.mock('../services/ProductoService');
jest.mock('../services/LoteService');
jest.mock('../services/VentaService');

const express = require('express');
const request = require('supertest');
const AppError = require('../errors/AppError');
const errorHandler = require('../middlewares/errorHandler');
const AuthService = require('../services/AuthService');
const UsuarioService = require('../services/UsuarioService');
const ProductoService = require('../services/ProductoService');
const LoteService = require('../services/LoteService');
const VentaService = require('../services/VentaService');
const authRoutes = require('./authRoutes');
const UsuarioRoutes = require('./UsuarioRoutes');
const ProductoRoutes = require('./ProductoRoutes');
const LoteRoutes = require('./LoteRoutes');
const RecurrenteWebhookRoutes = require('./RecurrenteWebhookRoutes');

const crearApp = () => {
  const app = express();
  app.use(
    '/api/webhooks/recurrente',
    express.raw({ type: 'application/json' }),
    RecurrenteWebhookRoutes,
  );
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', UsuarioRoutes);
  app.use('/api/productos', ProductoRoutes);
  app.use('/api/lotes', LoteRoutes);
  app.use(errorHandler);
  return app;
};

describe('centralización pendiente de errores y validaciones', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => consoleError.mockRestore());

  it('procesa la validación del login antes del controlador y omite el valor sensible', async () => {
    const respuesta = await request(crearApp())
      .post('/api/auth/login')
      .send({ correo_usuario: 'correo-invalido', contrasena: '' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('La solicitud contiene datos inválidos.');
    expect(respuesta.body.errores).toEqual(expect.any(Array));
    expect(JSON.stringify(respuesta.body)).not.toContain('correo-invalido');
    expect(AuthService.login).not.toHaveBeenCalled();
  });

  it('rechaza ids de usuario inválidos antes de invocar el servicio', async () => {
    const respuesta = await request(crearApp()).get('/api/usuarios/no-valido');

    expect(respuesta.status).toBe(400);
    expect(UsuarioService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('publica los AppError del dominio de productos', async () => {
    ProductoService.obtenerPorId.mockRejectedValue(
      new AppError('Producto no encontrado', 404),
    );

    const respuesta = await request(crearApp()).get('/api/productos/99');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body).toEqual({ mensaje: 'Producto no encontrado' });
  });

  it('aplica las validaciones extraídas de lotes antes del servicio', async () => {
    const respuesta = await request(crearApp())
      .post('/api/lotes')
      .send({ numero_lote: '' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual(expect.any(Array));
    expect(LoteService.crearLote).not.toHaveBeenCalled();
  });

  it('no expone respuestas crudas del proveedor de pagos', async () => {
    const errorProveedor = new Error('provider_token=secreto respuesta cruda');
    errorProveedor.status = 502;
    VentaService.procesarWebhookRecurrente.mockRejectedValue(errorProveedor);

    const respuesta = await request(crearApp())
      .post('/api/webhooks/recurrente')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'payment.failed' }));

    expect(respuesta.status).toBe(502);
    expect(respuesta.body).toEqual({ mensaje: 'Error interno del servidor.' });
    expect(JSON.stringify(respuesta.body)).not.toContain('secreto');
  });
});
