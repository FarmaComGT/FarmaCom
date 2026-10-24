const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const NOMBRE_ESQUEMA = 'historial_precio_ingreso_lote_migration_test';
const rutaMigracion = path.join(
  __dirname,
  '../../src/database/migrations/versioned/004_historial_precio_por_ingreso_lote.sql',
);

const entreComillas = (identificador) => `"${identificador.replaceAll('"', '""')}"`;

describe('migración 004: historial de precios por ingreso de lote', () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });
  let cliente;
  const esquema = entreComillas(NOMBRE_ESQUEMA);

  beforeAll(async () => {
    if (!process.env.POSTGRES_DB?.toLowerCase().includes('integration')) {
      throw new Error('La migración sólo se prueba en una base de integración.');
    }

    cliente = await pool.connect();
    await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
    await cliente.query(`CREATE SCHEMA ${esquema}`);
    await cliente.query(`SET search_path TO ${esquema}`);
    await cliente.query(`
      CREATE TABLE usuario (
        id_usuario SERIAL PRIMARY KEY
      );

      CREATE TABLE lote (
        id_lote SERIAL PRIMARY KEY,
        id_producto INTEGER NOT NULL,
        id_sucursal INTEGER NOT NULL,
        numero_lote VARCHAR(100) NOT NULL
      );

      CREATE TABLE historial_precio_lote (
        id_historial_precio BIGSERIAL PRIMARY KEY,
        id_lote INTEGER NOT NULL REFERENCES lote(id_lote),
        tipo_precio VARCHAR(10) NOT NULL,
        valor_anterior NUMERIC(10,2) NOT NULL,
        valor_nuevo NUMERIC(10,2) NOT NULL,
        id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
        fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_historial_tipo_precio
          CHECK (tipo_precio IN ('compra', 'venta')),
        CONSTRAINT chk_historial_valores_no_negativos
          CHECK (valor_anterior >= 0 AND valor_nuevo >= 0),
        CONSTRAINT chk_historial_valores_distintos
          CHECK (valor_anterior <> valor_nuevo)
      );

      INSERT INTO usuario DEFAULT VALUES;
      INSERT INTO lote (id_producto, id_sucursal, numero_lote)
      VALUES (1, 2, 'LOTE-EXISTENTE');
      INSERT INTO historial_precio_lote (
        id_lote, tipo_precio, valor_anterior, valor_nuevo, id_usuario
      ) VALUES (1, 'venta', 10.00, 12.00, 1);
    `);
  });

  afterAll(async () => {
    if (cliente) {
      await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
      cliente.release();
    }
    await pool.end();
  });

  test('preserva el historial existente y es idempotente', async () => {
    const migracion = fs.readFileSync(rutaMigracion, 'utf8');

    await expect(cliente.query(migracion)).resolves.toBeDefined();
    await expect(cliente.query(migracion)).resolves.toBeDefined();

    const lote = await cliente.query(
      `SELECT fecha_ingreso IS NOT NULL AS tiene_fecha_ingreso
       FROM ${esquema}.lote
       WHERE id_lote = 1`,
    );
    expect(lote.rows).toEqual([{ tiene_fecha_ingreso: true }]);

    const historial = await cliente.query(
      `SELECT valor_anterior::TEXT, valor_nuevo::TEXT, origen
       FROM ${esquema}.historial_precio_lote
       WHERE id_historial_precio = 1`,
    );
    expect(historial.rows).toEqual([{
      valor_anterior: '10.00',
      valor_nuevo: '12.00',
      origen: 'correccion_lote',
    }]);
  });

  test('acepta un valor inicial sin precio anterior', async () => {
    await expect(cliente.query(
      `INSERT INTO ${esquema}.historial_precio_lote (
         id_lote, tipo_precio, valor_anterior, valor_nuevo, origen, id_usuario
       ) VALUES (1, 'compra', NULL, 8.50, 'ingreso_lote', 1)`,
    )).resolves.toMatchObject({ rowCount: 1 });
  });

  test('mantiene la compatibilidad con registros de correcciones', async () => {
    const resultado = await cliente.query(
      `INSERT INTO ${esquema}.historial_precio_lote (
         id_lote, tipo_precio, valor_anterior, valor_nuevo, id_usuario
       ) VALUES (1, 'venta', 12.00, 13.00, 1)
       RETURNING origen`,
    );

    expect(resultado.rows).toEqual([{ origen: 'correccion_lote' }]);
  });

  test('rechaza orígenes, valores negativos y cambios sin diferencia', async () => {
    await expect(cliente.query(
      `INSERT INTO ${esquema}.historial_precio_lote (
         id_lote, tipo_precio, valor_anterior, valor_nuevo, origen, id_usuario
       ) VALUES (1, 'venta', 12.00, 13.00, 'manual', 1)`,
    )).rejects.toMatchObject({ code: '23514' });

    await expect(cliente.query(
      `INSERT INTO ${esquema}.historial_precio_lote (
         id_lote, tipo_precio, valor_anterior, valor_nuevo, origen, id_usuario
       ) VALUES (1, 'compra', NULL, -1.00, 'ingreso_lote', 1)`,
    )).rejects.toMatchObject({ code: '23514' });

    await expect(cliente.query(
      `INSERT INTO ${esquema}.historial_precio_lote (
         id_lote, tipo_precio, valor_anterior, valor_nuevo, origen, id_usuario
       ) VALUES (1, 'venta', 12.00, 12.00, 'ingreso_lote', 1)`,
    )).rejects.toMatchObject({ code: '23514' });
  });

  test('crea el índice para consultar el último lote', async () => {
    const indices = await cliente.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = $1
         AND indexname = 'idx_lote_producto_sucursal_ingreso'`,
      [NOMBRE_ESQUEMA],
    );

    expect(indices.rows).toEqual([{
      indexname: 'idx_lote_producto_sucursal_ingreso',
    }]);
  });
});
