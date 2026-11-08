jest.mock('../middlewares/verificarToken', () => (req, res, next) => {
  if (req.headers.cookie !== 'prueba=propietario') return res.status(401).json({ mensaje: 'No autenticado' });
  req.usuario = { id_usuario: 7, id_sucursal: 3, token_version: 2, rol: 'dependiente' };
  next();
});
jest.mock('../daos/UsuarioDAO');
const express = require('express');
const request = require('supertest');
const UsuarioDAO = require('../daos/UsuarioDAO');
const rutas = require('./LectorMovilRoutes');
const { lectorMovil } = require('../services/LectorMovilService');
const errorHandler = require('../middlewares/errorHandler');
const { randomUUID } = require('crypto');
const usuario = { id_usuario: 7, id_sucursal: 3, token_version: 2, rol: 'dependiente', estado_usuario: 'activo' };
const app = express();
app.set('trust proxy', 1);
app.use(express.json()); app.use('/api/lector-movil', rutas); app.use(errorHandler);
const preparar = (peticion) => peticion.set('X-Forwarded-Proto', 'https').set('Origin', 'https://farmacom.example');
const propietario = (peticion) => preparar(peticion).set('Cookie', 'prueba=propietario');

describe('Lector móvil: límites de API', () => {
  const frontendAnterior = process.env.FRONTEND_URL;
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://farmacom.example';
    UsuarioDAO.obtenerPorId.mockResolvedValue(usuario);
  });
  afterAll(() => { if (frontendAnterior === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = frontendAnterior; });

  it('rechaza HTTP y orígenes ajenos antes de aceptar credenciales', async () => {
    expect((await request(app).post('/api/lector-movil/sesiones').send({ destino: 'ventas' })).status).toBe(426);
    expect((await request(app).post('/api/lector-movil/sesiones').set('X-Forwarded-Proto', 'https').set('Origin', 'https://ajeno.example').send({ destino: 'ventas' })).status).toBe(403);
  });

  it('genera un QR de un solo uso y mantiene el secreto en el fragmento', async () => {
    const respuesta = await propietario(request(app).post('/api/lector-movil/sesiones')).send({ destino: 'ventas' });
    expect(respuesta.status).toBe(201);
    expect(respuesta.body.qr).toMatch(/^data:image\/png;base64,/);
    const url = new URL(respuesta.body.enlace);
    expect(url.search).toBe(''); expect(url.pathname).toBe('/lector-movil');
    expect(respuesta.body.token).toBeUndefined();
    lectorMovil.revocar(respuesta.body.id, usuario);
  });

  it('la credencial del teléfono no autoriza operaciones del propietario', async () => {
    const pc = lectorMovil.crear(usuario, 'ventas');
    const movil = await preparar(request(app).post(`/api/lector-movil/movil/${pc.id}/conectar`)).set('Authorization', `Bearer ${pc.token}`).send({});
    expect(movil.status).toBe(200);
    const confirmar = await preparar(request(app).post(`/api/lector-movil/sesiones/${pc.id}/confirmar`)).set('Authorization', `Bearer ${movil.body.token}`).send({});
    expect(confirmar.status).toBe(401);
    const enviar = await preparar(request(app).post(`/api/lector-movil/movil/${pc.id}/lecturas`)).set('Authorization', `Bearer ${movil.body.token}`).send({ id: randomUUID(), codigo: '000123' });
    expect(enviar.status).toBe(403);
    lectorMovil.revocar(pc.id, usuario);
  });

  it('invalida al teléfono cuando la cuenta de la computadora se desactiva', async () => {
    const pc = lectorMovil.crear(usuario, 'ventas'); const movil = lectorMovil.conectar(pc.id, pc.token);
    UsuarioDAO.obtenerPorId.mockResolvedValue({ ...usuario, estado_usuario: 'inactivo' });
    const estado = await preparar(request(app).get(`/api/lector-movil/movil/${pc.id}/estado`)).set('Authorization', `Bearer ${movil.token}`);
    expect(estado.status).toBe(410);
  });

  it('mantiene el teléfono al cambiar de destino y rechaza el contexto anterior en HTTP', async () => {
    const pc = lectorMovil.crear(usuario, 'ventas');
    const movil = lectorMovil.conectar(pc.id, pc.token); lectorMovil.confirmar(pc.id, usuario);
    const contextoVentas = randomUUID();
    await propietario(request(app).post(`/api/lector-movil/sesiones/${pc.id}/pulso`)).send({ disponible: true, contexto: contextoVentas, destino: 'ventas' }).expect(200);
    const contextoProducto = randomUUID();
    await propietario(request(app).post(`/api/lector-movil/sesiones/${pc.id}/pulso`)).send({ disponible: true, contexto: contextoProducto, destino: 'producto' }).expect(200);
    const lectura = (contexto) => preparar(request(app).post(`/api/lector-movil/movil/${pc.id}/lecturas`)).set('Authorization', `Bearer ${movil.token}`).send({ id: randomUUID(), codigo: '000123', contexto });
    expect((await lectura(contextoVentas)).status).toBe(409);
    expect((await lectura(contextoProducto)).status).toBe(200);
    lectorMovil.revocar(pc.id, usuario);
  });
});
