const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/database/db');

const CONTRASENA_PRUEBA = '123456';
const DPI_PRUEBA = '9999999999999';

const leerSql = (rutaRelativa) => fs.readFileSync(
  path.join(__dirname, rutaRelativa),
  'utf8',
);

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
  const nombreBase = process.env.POSTGRES_DB;
  if (!nombreBase || !nombreBase.toLowerCase().includes('integration')) {
    throw new Error('Las pruebas solo pueden ejecutarse sobre una base cuyo nombre incluya "integration".');
  }

  const esquema = fs.readFileSync(
    path.join(__dirname, '../../src/database/schema.sql'),
    'utf8',
  );
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  `);
  await pool.query(esquema);
  await pool.query(leerSql('fixtures.sql'));
});

afterAll(async () => {
  await pool.end();
});

describe('Integración API–PostgreSQL', () => {
  test('autentica un usuario real y devuelve su sesión desde PostgreSQL', async () => {
    const { respuesta } = await iniciarSesion('dueno@farma.com');

    expect(respuesta.body.usuario).toMatchObject({
      correo_usuario: 'dueno@farma.com',
      rol: 'dueno',
    });
  });

  test('crea paciente y expediente en una sola operación transaccional', async () => {
    const { respuesta: sesion, cookie } = await iniciarSesion('laboratorista@farma.com');
    const idLaboratorio = sesion.body.usuario.id_laboratorio;

    const respuesta = await request(app)
      .post('/api/pacientes')
      .set('Cookie', cookie)
      .send({
        id_laboratorio: idLaboratorio,
        nombre_paciente: 'Paciente Integración CI',
        dpi: DPI_PRUEBA,
        edad_manual: 34,
        sexo: 'F',
        telefono: '5555-0101',
        direccion: 'Datos ficticios para CI',
      })
      .expect(201);

    expect(respuesta.body).toMatchObject({
      nombre_paciente: 'Paciente Integración CI',
      dpi: DPI_PRUEBA,
      edad: 34,
    });
    expect(respuesta.body.id_expediente).toEqual(expect.any(Number));

    const persistencia = await pool.query(
      `SELECT p.id_paciente, e.id_expediente
       FROM paciente p
       JOIN expediente_laboratorio e ON e.id_paciente = p.id_paciente
       WHERE p.dpi = $1`,
      [DPI_PRUEBA],
    );
    expect(persistencia.rows).toHaveLength(1);
  });

  test('consulta por API el paciente y el expediente persistidos', async () => {
    const { cookie } = await iniciarSesion('laboratorista@farma.com');
    const paciente = await pool.query(
      'SELECT id_paciente FROM paciente WHERE dpi = $1',
      ['1234567890101'],
    );

    const respuesta = await request(app)
      .get(`/api/pacientes/${paciente.rows[0].id_paciente}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(respuesta.body).toMatchObject({
      dpi: '1234567890101',
      nombre_paciente: 'Paciente Demo Uno',
      id_expediente: expect.any(Number),
    });
  });

  test('maneja el precio de compra por lote y un vencimiento opcional', async () => {
    const { cookie } = await iniciarSesion('dueno@farma.com');
    const catalogos = await pool.query(`
      SELECT
        (SELECT id_presentacion FROM presentacion ORDER BY id_presentacion LIMIT 1) AS id_presentacion,
        (SELECT id_categoria FROM categoria ORDER BY id_categoria LIMIT 1) AS id_categoria,
        (SELECT id_casa FROM casa_farmaceutica ORDER BY id_casa LIMIT 1) AS id_casa,
        (SELECT id_proveedor FROM proveedor ORDER BY id_proveedor LIMIT 1) AS id_proveedor,
        (SELECT id_sucursal FROM sucursal ORDER BY id_sucursal LIMIT 1) AS id_sucursal
    `);
    const ids = catalogos.rows[0];
    const sufijo = Date.now();
    const codigo = `INT-LOTE-${sufijo}`;

    const producto = await request(app)
      .post('/api/productos')
      .set('Cookie', cookie)
      .send({
        codigo,
        nombre_comercial: `Producto por lote ${sufijo}`,
        nombre_generico: `Genérico por lote ${sufijo}`,
        id_presentacion: ids.id_presentacion,
        id_categoria: ids.id_categoria,
        id_casa: ids.id_casa,
        id_proveedor: ids.id_proveedor,
        stock_minimo: 2,
        meses_alerta_vencimiento: 3,
      })
      .expect(201);

    expect(producto.body).not.toHaveProperty('precio_compra');

    const lote = await request(app)
      .post('/api/lotes')
      .set('Cookie', cookie)
      .send({
        id_producto: producto.body.id_producto,
        id_proveedor: ids.id_proveedor,
        id_sucursal: ids.id_sucursal,
        numero_lote: `LT-${sufijo}`,
        fecha_vencimiento: null,
        cantidad_ingresada: 12,
        precio_compra: 8.75,
        precio_venta: 12.5,
        margen_ganancia: 42.8571,
      })
      .expect(201);

    expect(lote.body).toMatchObject({
      id_producto: producto.body.id_producto,
      fecha_vencimiento: null,
      precio_compra: '8.75',
    });

    const autocompletado = await request(app)
      .get('/api/productos/autocompletar')
      .query({ busqueda: codigo, limite: 10 })
      .set('Cookie', cookie)
      .expect(200);

    expect(autocompletado.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id_producto: producto.body.id_producto,
        id_lote: lote.body.id_lote,
        fecha_vencimiento: null,
      }),
    ]));
  });

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
    expect(telefono.body).toMatchObject({ id_cliente: cliente.id_cliente, numero: '55551234' });

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
    expect(telefonos.body.map(({ numero }) => numero)).toEqual(['55551234']);
    expect(correos.body.map(({ correo }) => correo)).toEqual(['cliente.ci@farmacom.test']);

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

describe('Regresión de funcionalidades existentes', () => {
  test('conserva la cookie httpOnly al iniciar sesión correctamente', async () => {
    const { respuesta } = await iniciarSesion('dueno@farma.com');
    const cookie = respuesta.headers['set-cookie'][0];

    expect(cookie).toContain('auth_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });

  test('mantiene el rechazo 403 para un laboratorista en funciones de farmacia', async () => {
    const { cookie } = await iniciarSesion('laboratorista@farma.com');

    const respuesta = await request(app)
      .post('/api/categorias')
      .set('Cookie', cookie)
      .send({ nombre: 'Categoría no autorizada' })
      .expect(403);

    expect(respuesta.body.mensaje).toContain('Acceso denegado');
  });

  test('mantiene la búsqueda tolerante a mayúsculas y tildes', async () => {
    const { cookie } = await iniciarSesion('dueno@farma.com');

    const respuesta = await request(app)
      .get('/api/productos/autocompletar')
      .query({ busqueda: 'ACIDO FOLICO', limite: 10 })
      .set('Cookie', cookie)
      .expect(200);

    expect(respuesta.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        codigo: 'INT-ACIDO-001',
        nombre_comercial: 'Ácido Fólico CI',
      }),
    ]));
  });
});
