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

describe('Integración API–PostgreSQL', () => {
  test('administra teléfonos y correos de un cliente con detección de duplicados', async () => {
    const { cookie } = await iniciarSesion('dueno@farma.com');

    const crearCliente = (nombre) => request(app)
      .post('/api/clientes')
      .set('Cookie', cookie)
      .send({ nombre_cliente: nombre })
      .expect(201);

    const { body: cliente } = await crearCliente('Cliente Contactos CI');
    const { body: otroCliente } = await crearCliente('Otro Cliente Contactos CI');
    const rutaCliente = `/api/clientes/${cliente.id_cliente}`;

    const telefono = await request(app)
      .post(`${rutaCliente}/telefonos`)
      .set('Cookie', cookie)
      .send({ numero: '5555-1234' })
      .expect(201);

    expect(telefono.body).toMatchObject({
      id_cliente: cliente.id_cliente,
      numero: '55551234',
    });

    await request(app)
      .post(`${rutaCliente}/telefonos`)
      .set('Cookie', cookie)
      .send({ numero: '5555 1234' })
      .expect(409);

    await request(app)
      .post(`${rutaCliente}/correos`)
      .set('Cookie', cookie)
      .send({ correo: 'Cliente.CI@Farmacom.test' })
      .expect(201);

    await request(app)
      .post(`${rutaCliente}/correos`)
      .set('Cookie', cookie)
      .send({ correo: 'cliente.ci@farmacom.test' })
      .expect(409);

    await request(app)
      .post(`/api/clientes/${otroCliente.id_cliente}/telefonos`)
      .set('Cookie', cookie)
      .send({ numero: '55551234' })
      .expect(201);

    await request(app)
      .delete(`/api/clientes/${otroCliente.id_cliente}/telefonos/${telefono.body.id_telefono}`)
      .set('Cookie', cookie)
      .expect(404);

    const telefonos = await request(app)
      .get(`${rutaCliente}/telefonos`)
      .set('Cookie', cookie)
      .expect(200);

    const correos = await request(app)
      .get(`${rutaCliente}/correos`)
      .set('Cookie', cookie)
      .expect(200);

    expect(telefonos.body.map(({ numero }) => numero))
      .toEqual(['55551234']);

    expect(correos.body.map(({ correo }) => correo))
      .toEqual(['cliente.ci@farmacom.test']);

    await request(app)
      .delete(rutaCliente)
      .set('Cookie', cookie)
      .expect(200);

    const restantes = await pool.query(
      'SELECT COUNT(*)::int AS total FROM cliente_telefono WHERE id_cliente = $1',
      [cliente.id_cliente],
    );

    expect(restantes.rows[0].total).toBe(0);
  });
});

registrarVentas(contexto);
registrarRegresion(contexto);
