const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/database/db');
const { prepararBaseIntegracion } = require('./preparar-base');

const CONTRASENA_PRUEBA = '123456';
const DPI_PRUEBA = '9999999999999';
const DPI_ROLLBACK = '9999999999998';

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

describe('Integración API–PostgreSQL', () => {
  test('autentica un usuario real y devuelve su sesión desde PostgreSQL', async () => {
    const { respuesta } = await iniciarSesion('dueno@farma.com');

    expect(respuesta.body.usuario).toMatchObject({
      correo_usuario: 'dueno@farma.com',
      rol: 'dueno',
    });
  });

  test('rechaza una contraseña incorrecta sin revelar si el usuario existe', async () => {
    const credenciales = { contrasena: 'contrasena-incorrecta' };

    const usuarioExistente = await request(app)
      .post('/api/auth/login')
      .send({ ...credenciales, correo_usuario: 'dueno@farma.com' })
      .expect(401);
    const usuarioInexistente = await request(app)
      .post('/api/auth/login')
      .send({ ...credenciales, correo_usuario: 'nadie@farma.com' })
      .expect(401);

    expect(usuarioExistente.body).toEqual(usuarioInexistente.body);
    expect(usuarioExistente.body.mensaje).toBe('Credenciales inválidas');
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

  test('revierte el paciente si falla la creación de su expediente', async () => {
    const { respuesta: sesion, cookie } = await iniciarSesion('laboratorista@farma.com');
    const idLaboratorio = sesion.body.usuario.id_laboratorio;
    const errorEsperado = jest.spyOn(console, 'error').mockImplementation(() => {});

    await pool.query(`
      CREATE OR REPLACE FUNCTION integration_fallar_expediente()
      RETURNS TRIGGER AS $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM paciente
          WHERE id_paciente = NEW.id_paciente
            AND dpi = '${DPI_ROLLBACK}'
        ) THEN
          RAISE EXCEPTION 'Fallo controlado para comprobar el rollback';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER integration_fallar_expediente_trigger
      BEFORE INSERT ON expediente_laboratorio
      FOR EACH ROW EXECUTE FUNCTION integration_fallar_expediente();
    `);

    try {
      await request(app)
        .post('/api/pacientes')
        .set('Cookie', cookie)
        .send({
          id_laboratorio: idLaboratorio,
          nombre_paciente: 'Paciente Rollback Integración',
          dpi: DPI_ROLLBACK,
          edad_manual: 40,
          sexo: 'Otro',
        })
        .expect(500);

      const pacienteParcial = await pool.query(
        'SELECT id_paciente FROM paciente WHERE dpi = $1',
        [DPI_ROLLBACK],
      );
      expect(pacienteParcial.rows).toHaveLength(0);
      expect(errorEsperado).toHaveBeenCalled();
    } finally {
      errorEsperado.mockRestore();
      await pool.query(`
        DROP TRIGGER IF EXISTS integration_fallar_expediente_trigger
          ON expediente_laboratorio;
        DROP FUNCTION IF EXISTS integration_fallar_expediente();
      `);
    }
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

    const persistencia = await pool.query(
      `SELECT p.codigo, l.numero_lote, l.stock_actual, l.precio_compra::TEXT
       FROM producto p
       JOIN lote l ON l.id_producto = p.id_producto
       WHERE p.id_producto = $1 AND l.id_lote = $2`,
      [producto.body.id_producto, lote.body.id_lote],
    );
    expect(persistencia.rows).toEqual([{
      codigo,
      numero_lote: `LT-${sufijo}`,
      stock_actual: 12,
      precio_compra: '8.75',
    }]);

    const inventario = await request(app)
      .get(`/api/sucursales/${ids.id_sucursal}/inventario`)
      .set('Cookie', cookie)
      .expect(200);

    expect(inventario.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id_producto: producto.body.id_producto,
        stock_total: '12',
      }),
    ]));

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
