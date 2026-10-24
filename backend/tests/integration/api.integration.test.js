const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/database/db');
const { prepararBaseIntegracion } = require('./preparar-base');
const registrarAutenticacion = require('./casos/autenticacion');
const registrarInventario = require('./casos/inventario');
const registrarPacientes = require('./casos/pacientes');
const registrarRegresion = require('./casos/regresion');
const registrarVentas = require('./casos/ventas');

const CONTRASENA_PRUEBA = '123456';

const iniciarSesion = async (correo) => {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo_usuario: correo, contrasena: CONTRASENA_PRUEBA })
    .expect(200);

  const cookies = respuesta.headers['set-cookie'];
  expect(cookies).toBeDefined();
  return { respuesta, cookie: cookies[0] };
};

beforeAll(async () => {
  await prepararBaseIntegracion(pool);
});

afterAll(async () => {
  await pool.end();
});

const contexto = { app, iniciarSesion, pool, request };

registrarAutenticacion(contexto);
registrarPacientes(contexto);
registrarInventario(contexto);
registrarVentas(contexto);
registrarRegresion(contexto);
