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
